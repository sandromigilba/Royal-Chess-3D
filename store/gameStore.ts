import { create } from 'zustand'
import { Chess } from 'chess.js'
import { useSettingsStore } from './settingsStore'

export type GameMode = 'pvp' | 'ai' | 'multiplayer';
export type PlayerColor = 'white' | 'black';

export interface MoveRecord {
  from: string;
  to: string;
  san: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
  promotion?: string;
  timestamp: number;
}

export interface GameState {
  // tracks whether a game has been explicitly started
  isGameStarted: boolean;
  fen: string;
  board: ReturnType<Chess['board']>;
  turn: 'w' | 'b';
  gameMode: GameMode;
  playerColor: PlayerColor; // User's color in Player vs AI or Multiplayer
  isAiThinking: boolean;
  history: MoveRecord[];
  historyIndex: number;
  fenHistory: string[];
  lastMove: { from: string; to: string } | null;

  // Game timers (seconds remaining)
  whiteTime: number; // in seconds, 0 if untimed
  blackTime: number;
  initialTime: number; // in seconds, 0 if untimed
  isTimerRunning: boolean;

  // Status flags
  isGameOver: boolean;
  gameOverReason: 'checkmate' | 'stalemate' | 'threefold' | 'draw_offer' | 'insufficient' | 'fifty_moves' | 'timeout' | 'resigned' | null;
  winner: 'white' | 'black' | 'draw' | null;
  inCheck: boolean;

  // Captured pieces lists
  capturedPieces: {
    w: { p: number; n: number; b: number; r: number; q: number };
    b: { p: number; n: number; b: number; r: number; q: number };
  };

  // Multiplayer online state
  playerId: string;
  inviteCode: string | null;
  isMultiplayerGameStarted: boolean;
  isConnectingMultiplayer: boolean;

  // Actions
  startNewGame: (mode: GameMode, colorChoice: 'white' | 'black' | 'random', timeMinutes: number) => void;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  undoMove: () => void;
  redoMove: () => void;
  restartGame: () => void;
  setAiThinking: (thinking: boolean) => void;
  tickTimers: () => void;
  importFen: (fen: string) => boolean;
  importPgn: (pgn: string) => boolean;
  exportFen: () => string;
  exportPgn: () => string;
  claimDraw: () => void;
  saveGame: () => void;
  loadGame: () => boolean;
  triggerAiMove: () => Promise<void>;

  // Multiplayer actions
  createMultiplayerGame: (colorChoice: 'white' | 'black' | 'random', timeMinutes: number) => Promise<string | null>;
  joinMultiplayerGame: (code: string) => Promise<boolean>;
  syncMultiplayerState: (remote: any) => void;
  makeMultiplayerMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  resignMultiplayerGame: () => Promise<void>;
  leaveMultiplayerGame: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const SAVE_KEY = 'chess_3d_match_save';

const EMPTY_CAPTURED = {
  w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
};

/** Derives captured piece counts by diffing piece totals vs starting position */
function getCapturedPieces(fen: string): GameState['capturedPieces'] {
  const chess = new Chess(fen);
  const whitePieces = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const blackPieces = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq && sq.type !== 'k') {
        const t = sq.type as keyof typeof whitePieces;
        if (sq.color === 'w') whitePieces[t]++;
        else blackPieces[t]++;
      }
    }
  }

  return {
    w: { // White captured (black pieces removed from board)
      p: Math.max(0, 8 - blackPieces.p),
      n: Math.max(0, 2 - blackPieces.n),
      b: Math.max(0, 2 - blackPieces.b),
      r: Math.max(0, 2 - blackPieces.r),
      q: Math.max(0, 1 - blackPieces.q),
    },
    b: { // Black captured (white pieces removed from board)
      p: Math.max(0, 8 - whitePieces.p),
      n: Math.max(0, 2 - whitePieces.n),
      b: Math.max(0, 2 - whitePieces.b),
      r: Math.max(0, 2 - whitePieces.r),
      q: Math.max(0, 1 - whitePieces.q),
    },
  };
}

/** Derive winner/reason from a Chess instance (after a move is applied) */
function deriveGameOver(chess: Chess, previousTurn: 'w' | 'b'): {
  isGameOver: boolean;
  winner: GameState['winner'];
  gameOverReason: GameState['gameOverReason'];
} {
  if (chess.isCheckmate()) {
    return {
      isGameOver: true,
      winner: previousTurn === 'w' ? 'white' : 'black',
      gameOverReason: 'checkmate',
    };
  }
  if (chess.isStalemate()) {
    const stalemateRuleEnabled = useSettingsStore.getState().stalemateRuleEnabled;
    return {
      isGameOver: true,
      winner: stalemateRuleEnabled ? 'draw' : (previousTurn === 'w' ? 'white' : 'black'),
      gameOverReason: 'stalemate',
    };
  }
  if (chess.isInsufficientMaterial()) return { isGameOver: true, winner: 'draw', gameOverReason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { isGameOver: true, winner: 'draw', gameOverReason: 'threefold' };
  if (chess.isDraw()) return { isGameOver: true, winner: 'draw', gameOverReason: 'fifty_moves' };
  return { isGameOver: false, winner: null, gameOverReason: null };
}

// Helper to generate a unique player identity
const getOrCreatePlayerId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('chess_3d_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('chess_3d_player_id', id);
  }
  return id;
};

// ─── Global Callbacks ────────────────────────────────
let playSoundFunc: (type: 'move' | 'capture' | 'check' | 'checkmate' | 'victory' | 'draw' | 'promotion') => void = () => {};
export const setSoundPlayer = (fn: typeof playSoundFunc) => { playSoundFunc = fn; };

let requestAiMoveFunc: (fen: string, difficulty: string) => Promise<{ from: string; to: string; promotion?: string }> = async () => ({ from: '', to: '' });
export const setAiPlayer = (fn: typeof requestAiMoveFunc) => { requestAiMoveFunc = fn; };

// ─── Store ───────────────────────────────────────────────────────────────────
export const useGameStore = create<GameState>((set, get) => {
  const initialChess = new Chess(INITIAL_FEN);

  return {
    isGameStarted: false,
    fen: INITIAL_FEN,
    board: initialChess.board(),
    turn: 'w',
    gameMode: 'pvp',
    playerColor: 'white',
    isAiThinking: false,
    history: [],
    historyIndex: 0,
    fenHistory: [INITIAL_FEN],
    lastMove: null,
    whiteTime: 0,
    blackTime: 0,
    initialTime: 0,
    isTimerRunning: false,
    isGameOver: false,
    gameOverReason: null,
    winner: null,
    inCheck: false,
    capturedPieces: { ...EMPTY_CAPTURED },

    // Multiplayer initial state
    playerId: getOrCreatePlayerId(),
    inviteCode: null,
    isMultiplayerGameStarted: false,
    isConnectingMultiplayer: false,

    // ────────────────────────────────────────────────────────────────────────
    startNewGame: (mode, colorChoice, timeMinutes) => {
      // Clear multiplayer state
      set({ inviteCode: null, isMultiplayerGameStarted: false });

      const selectedColor: PlayerColor =
        colorChoice === 'random'
          ? (Math.random() < 0.5 ? 'white' : 'black')
          : colorChoice;

      const seconds = timeMinutes * 60;
      const chess = new Chess(INITIAL_FEN);

      set({
        isGameStarted: true,
        fen: INITIAL_FEN,
        board: chess.board(),
        turn: 'w',
        gameMode: mode,
        playerColor: selectedColor,
        isAiThinking: false,
        history: [],
        historyIndex: 0,
        fenHistory: [INITIAL_FEN],
        lastMove: null,
        whiteTime: seconds,
        blackTime: seconds,
        initialTime: seconds,
        isTimerRunning: seconds > 0,
        isGameOver: false,
        gameOverReason: null,
        winner: null,
        inCheck: false,
        capturedPieces: { ...EMPTY_CAPTURED },
      });

      get().saveGame();

      // If AI mode and AI goes first (player chose black)
      if (mode === 'ai' && selectedColor === 'black') {
        setTimeout(() => get().triggerAiMove(), 0);
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    makeMove: (from, to, promotion) => {
      const state = get();
      if (state.isGameOver || state.isAiThinking) return false;

      // Handle online multiplayer move logic
      if (state.gameMode === 'multiplayer') {
        const ourTurn = state.turn === (state.playerColor === 'white' ? 'w' : 'b');
        if (!ourTurn) return false;

        // Apply optimistically local
        const chess = new Chess(state.fen);
        try {
          const moveResult = chess.move({ from, to, promotion });
          if (!moveResult) return false;

          const nextFen = chess.fen();
          const nextTurn = chess.turn();
          const nextInCheck = chess.inCheck();
          const { isGameOver: nextIsGameOver, winner: nextWinner, gameOverReason: reason } = deriveGameOver(chess, state.turn);

          const record: MoveRecord = {
            from,
            to,
            san: moveResult.san,
            color: moveResult.color,
            piece: moveResult.piece,
            captured: moveResult.captured,
            promotion: moveResult.promotion,
            timestamp: Date.now(),
          };

          const newHistory = [...state.history.slice(0, state.historyIndex), record];
          const newFenHistory = [...state.fenHistory.slice(0, state.historyIndex + 1), nextFen];

          set({
            fen: nextFen,
            board: chess.board(),
            turn: nextTurn,
            history: newHistory,
            historyIndex: newHistory.length,
            fenHistory: newFenHistory,
            lastMove: { from, to },
            capturedPieces: getCapturedPieces(nextFen),
            inCheck: nextInCheck,
            isGameOver: nextIsGameOver,
            winner: nextWinner,
            gameOverReason: reason,
          });

          // Play move sound instantly
          if (moveResult.captured) {
            playSoundFunc('capture');
          } else {
            playSoundFunc('move');
          }

          // Submit to server
          state.makeMultiplayerMove(from, to, promotion);
          return true;
        } catch {
          return false;
        }
      }

      const chess = new Chess(state.fen);

      try {
        const moveResult = chess.move({ from, to, promotion });
        if (!moveResult) return false;

        const nextFen = chess.fen();
        const nextTurn = chess.turn();
        const nextInCheck = chess.inCheck();
        const { isGameOver: nextIsGameOver, winner: nextWinner, gameOverReason: reason } = deriveGameOver(chess, state.turn);

        const record: MoveRecord = {
          from,
          to,
          san: moveResult.san,
          color: moveResult.color,
          piece: moveResult.piece,
          captured: moveResult.captured,
          promotion: moveResult.promotion,
          timestamp: Date.now(),
        };

        const newHistory = [...state.history.slice(0, state.historyIndex), record];
        const newFenHistory = [...state.fenHistory.slice(0, state.historyIndex + 1), nextFen];
        const nextIndex = newHistory.length;

        set({
          fen: nextFen,
          board: chess.board(),
          turn: nextTurn,
          history: newHistory,
          historyIndex: nextIndex,
          fenHistory: newFenHistory,
          lastMove: { from, to },
          capturedPieces: getCapturedPieces(nextFen),
          inCheck: nextInCheck,
          isGameOver: nextIsGameOver,
          winner: nextWinner,
          gameOverReason: reason,
          isTimerRunning: !nextIsGameOver && state.initialTime > 0,
        });

        // Sound effects
        if (nextIsGameOver) {
          if (nextWinner === 'draw') playSoundFunc('draw');
          else if (nextWinner === state.playerColor || state.gameMode === 'pvp') playSoundFunc('victory');
          else playSoundFunc('checkmate');
        } else if (nextInCheck) {
          playSoundFunc('check');
        } else if (moveResult.captured) {
          playSoundFunc('capture');
        } else if (moveResult.promotion) {
          playSoundFunc('promotion');
        } else {
          playSoundFunc('move');
        }

        get().saveGame();

        // Trigger AI response if needed
        if (!nextIsGameOver && state.gameMode === 'ai' && nextTurn === (state.playerColor === 'white' ? 'b' : 'w')) {
          get().triggerAiMove();
        }

        return true;
      } catch {
        return false;
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    undoMove: () => {
      const state = get();
      if (state.isAiThinking || state.gameMode === 'multiplayer') return;

      const movesToUndo = state.gameMode === 'ai' ? 2 : 1;
      const targetIndex = Math.max(0, state.historyIndex - movesToUndo);
      if (targetIndex === state.historyIndex) return;

      const targetFen = state.fenHistory[targetIndex];
      const chess = new Chess(targetFen);

      set({
        fen: targetFen,
        board: chess.board(),
        turn: chess.turn(),
        historyIndex: targetIndex,
        lastMove: targetIndex > 0
          ? { from: state.history[targetIndex - 1].from, to: state.history[targetIndex - 1].to }
          : null,
        capturedPieces: getCapturedPieces(targetFen),
        inCheck: chess.inCheck(),
        isGameOver: false,
        gameOverReason: null,
        winner: null,
        isTimerRunning: state.initialTime > 0,
      });

      playSoundFunc('move');
      get().saveGame();
    },

    // ────────────────────────────────────────────────────────────────────────
    redoMove: () => {
      const state = get();
      if (state.isAiThinking || state.gameMode === 'multiplayer') return;

      const movesToRedo = state.gameMode === 'ai' ? 2 : 1;
      const targetIndex = Math.min(state.history.length, state.historyIndex + movesToRedo);
      if (targetIndex === state.historyIndex) return;

      const targetFen = state.fenHistory[targetIndex];
      const chess = new Chess(targetFen);
      const { isGameOver, winner, gameOverReason } = deriveGameOver(chess, chess.turn() === 'w' ? 'b' : 'w');

      set({
        fen: targetFen,
        board: chess.board(),
        turn: chess.turn(),
        historyIndex: targetIndex,
        lastMove: {
          from: state.history[targetIndex - 1].from,
          to: state.history[targetIndex - 1].to,
        },
        capturedPieces: getCapturedPieces(targetFen),
        inCheck: chess.inCheck(),
        isGameOver,
        winner,
        gameOverReason,
        isTimerRunning: !isGameOver && state.initialTime > 0,
      });

      playSoundFunc('move');
      get().saveGame();
    },

    // ────────────────────────────────────────────────────────────────────────
    restartGame: () => {
      const state = get();
      if (state.isAiThinking) return;
      if (state.gameMode === 'multiplayer') {
        // restart multiplayer is equivalent to leaving and creating new
        return;
      }
      state.startNewGame(state.gameMode, state.playerColor, state.initialTime / 60);
    },

    setAiThinking: (isAiThinking) => set({ isAiThinking }),

    // ────────────────────────────────────────────────────────────────────────
    tickTimers: () => {
      const state = get();
      if (state.isGameOver || !state.isTimerRunning || state.initialTime === 0) return;

      // In multiplayer, timers are synced from server polling
      if (state.gameMode === 'multiplayer') {
        const isWhiteTurn = state.turn === 'w';
        const currentTime = isWhiteTurn ? state.whiteTime : state.blackTime;
        const nextTime = Math.max(0, currentTime - 1);
        if (isWhiteTurn) set({ whiteTime: nextTime });
        else set({ blackTime: nextTime });
        return;
      }

      const isWhiteTurn = state.turn === 'w';
      const currentTime = isWhiteTurn ? state.whiteTime : state.blackTime;
      const nextTime = Math.max(0, currentTime - 1);

      if (isWhiteTurn) {
        set({ whiteTime: nextTime });
      } else {
        set({ blackTime: nextTime });
      }

      if (nextTime === 0) {
        set({
          isGameOver: true,
          gameOverReason: 'timeout',
          winner: isWhiteTurn ? 'black' : 'white',
          isTimerRunning: false,
        });
        playSoundFunc('checkmate');
        get().saveGame();
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    importFen: (fen) => {
      if (get().gameMode === 'multiplayer') return false;
      try {
        const chess = new Chess(fen);
        const { isGameOver, winner, gameOverReason } = deriveGameOver(chess, chess.turn() === 'w' ? 'b' : 'w');

        set({
          isGameStarted: true,
          fen,
          board: chess.board(),
          turn: chess.turn(),
          historyIndex: 0,
          history: [],
          fenHistory: [fen],
          lastMove: null,
          capturedPieces: getCapturedPieces(fen),
          inCheck: chess.inCheck(),
          isGameOver,
          winner,
          gameOverReason,
          isTimerRunning: !isGameOver && get().initialTime > 0,
        });

        get().saveGame();
        return true;
      } catch {
        return false;
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    importPgn: (pgn) => {
      if (get().gameMode === 'multiplayer') return false;
      try {
        const chess = new Chess();
        chess.loadPgn(pgn);
        const historyMoves = chess.history({ verbose: true });

        const newHistory: MoveRecord[] = historyMoves.map((m) => ({
          from: m.from,
          to: m.to,
          san: m.san,
          color: m.color,
          piece: m.piece,
          captured: m.captured,
          promotion: m.promotion,
          timestamp: Date.now(),
        }));

        const replayChess = new Chess();
        const newFenHistory = [replayChess.fen()];
        for (const m of historyMoves) {
          replayChess.move(m);
          newFenHistory.push(replayChess.fen());
        }

        const finalFen = chess.fen();
        const { isGameOver, winner, gameOverReason } = deriveGameOver(chess, chess.turn() === 'w' ? 'b' : 'w');

        set({
          isGameStarted: true,
          fen: finalFen,
          board: chess.board(),
          turn: chess.turn(),
          history: newHistory,
          historyIndex: newHistory.length,
          fenHistory: newFenHistory,
          lastMove: newHistory.length > 0
            ? { from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to }
            : null,
          capturedPieces: getCapturedPieces(finalFen),
          inCheck: chess.inCheck(),
          isGameOver,
          winner,
          gameOverReason,
          isTimerRunning: !isGameOver && get().initialTime > 0,
        });

        get().saveGame();
        return true;
      } catch {
        return false;
      }
    },

    exportFen: () => get().fen,

    exportPgn: () => {
      const state = get();
      const chess = new Chess();
      for (let i = 0; i < state.historyIndex; i++) {
        const h = state.history[i];
        chess.move({ from: h.from, to: h.to, promotion: h.promotion });
      }
      return chess.pgn();
    },

    // ────────────────────────────────────────────────────────────────────────
    claimDraw: () => {
      const state = get();
      if (state.isGameOver) return;
      if (state.gameMode === 'multiplayer') {
        // Claiming draw in multiplayer
        state.resignMultiplayerGame();
        return;
      }
      set({
        isGameOver: true,
        gameOverReason: 'draw_offer',
        winner: 'draw',
        isTimerRunning: false,
      });
      playSoundFunc('draw');
      get().saveGame();
    },

    // ────────────────────────────────────────────────────────────────────────
    saveGame: () => {
      const state = get();
      if (state.gameMode === 'multiplayer') return; // Do not save online games in localStorage

      const payload = {
        isGameStarted: state.isGameStarted,
        fen: state.fen,
        turn: state.turn,
        gameMode: state.gameMode,
        playerColor: state.playerColor,
        history: state.history,
        historyIndex: state.historyIndex,
        fenHistory: state.fenHistory,
        lastMove: state.lastMove,
        whiteTime: state.whiteTime,
        blackTime: state.blackTime,
        initialTime: state.initialTime,
        isTimerRunning: false,
        isGameOver: state.isGameOver,
        gameOverReason: state.gameOverReason,
        winner: state.winner,
        inCheck: state.inCheck,
        capturedPieces: state.capturedPieces,
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch {
        // fail-safe
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    loadGame: () => {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;

        const data = JSON.parse(saved);
        if (data.gameMode === 'multiplayer') return false; // Ignore multiplayer on local reload

        const chess = new Chess(data.fen);

        set({
          isGameStarted: data.isGameStarted ?? true,
          fen: data.fen,
          board: chess.board(),
          turn: data.turn ?? chess.turn(),
          gameMode: data.gameMode ?? 'pvp',
          playerColor: data.playerColor ?? 'white',
          isAiThinking: false,
          history: data.history ?? [],
          historyIndex: typeof data.historyIndex === 'number' ? data.historyIndex : (data.history ?? []).length,
          fenHistory: data.fenHistory ?? [data.fen],
          lastMove: data.lastMove ?? null,
          whiteTime: data.whiteTime ?? 0,
          blackTime: data.blackTime ?? 0,
          initialTime: data.initialTime ?? 0,
          isTimerRunning: !data.isGameOver && (data.initialTime ?? 0) > 0,
          isGameOver: data.isGameOver ?? false,
          gameOverReason: data.gameOverReason ?? null,
          winner: data.winner ?? null,
          inCheck: data.inCheck ?? false,
          capturedPieces: data.capturedPieces ?? getCapturedPieces(data.fen),
          inviteCode: null,
          isMultiplayerGameStarted: false,
        });

        if (
          !data.isGameOver &&
          data.gameMode === 'ai' &&
          data.turn === (data.playerColor === 'white' ? 'b' : 'w')
        ) {
          setTimeout(() => get().triggerAiMove(), 150);
        }

        return true;
      } catch {
        localStorage.removeItem(SAVE_KEY);
        return false;
      }
    },

    // ────────────────────────────────────────────────────────────────────────
    triggerAiMove: async () => {
      const state = get();
      if (state.isGameOver || state.isAiThinking) return;

      set({ isAiThinking: true });
      const difficulty = useSettingsStore.getState().aiDifficulty;

      try {
        const aiMove = await requestAiMoveFunc(state.fen, difficulty);
        set({ isAiThinking: false });

        if (aiMove && aiMove.from && aiMove.to) {
          get().makeMove(aiMove.from, aiMove.to, aiMove.promotion);
        }
      } catch (err) {
        console.error('AI move error:', err);
        set({ isAiThinking: false });
      }
    },

    // ─── Multiplayer Actions ────────────────────────────────────────────────

    createMultiplayerGame: async (colorChoice, timeMinutes) => {
      const state = get();
      set({ isConnectingMultiplayer: true });

      try {
        const res = await fetch('/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colorChoice,
            timeMinutes,
            playerId: state.playerId,
          }),
        });

        if (!res.ok) throw new Error('Failed to create online game');
        const data = await res.json();

        set({
          isGameStarted: true,
          gameMode: 'multiplayer',
          inviteCode: data.inviteCode,
          playerColor: data.playerColor,
          isConnectingMultiplayer: false,
          isMultiplayerGameStarted: false,
          fen: INITIAL_FEN,
          board: new Chess(INITIAL_FEN).board(),
          turn: 'w',
          history: [],
          historyIndex: 0,
          fenHistory: [INITIAL_FEN],
          lastMove: null,
          whiteTime: timeMinutes * 60,
          blackTime: timeMinutes * 60,
          initialTime: timeMinutes * 60,
          isTimerRunning: false,
          isGameOver: false,
          gameOverReason: null,
          winner: null,
          inCheck: false,
          capturedPieces: { ...EMPTY_CAPTURED },
        });

        return data.inviteCode;
      } catch (err) {
        console.error('Create multiplayer match error:', err);
        set({ isConnectingMultiplayer: false });
        return null;
      }
    },

    joinMultiplayerGame: async (code) => {
      const state = get();
      const cleanCode = code.trim().toUpperCase();
      set({ isConnectingMultiplayer: true });

      try {
        const res = await fetch('/api/game/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: cleanCode,
            playerId: state.playerId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to join game');
        }

        const data = await res.json();
        const game = data.game;

        const chess = new Chess(game.fen);

        set({
          isGameStarted: true,
          gameMode: 'multiplayer',
          inviteCode: cleanCode,
          playerColor: data.playerColor,
          isConnectingMultiplayer: false,
          isMultiplayerGameStarted: true,
          fen: game.fen,
          board: chess.board(),
          turn: game.turn,
          history: game.history ? JSON.parse(game.history) : [],
          historyIndex: game.history ? JSON.parse(game.history).length : 0,
          fenHistory: game.fen_history ? JSON.parse(game.fen_history) : [INITIAL_FEN],
          lastMove: game.last_move ? JSON.parse(game.last_move) : null,
          whiteTime: game.white_time,
          blackTime: game.black_time,
          initialTime: game.initial_time,
          isTimerRunning: !game.is_game_over && game.initial_time > 0,
          isGameOver: !!game.is_game_over,
          gameOverReason: game.game_over_reason,
          winner: game.winner,
          inCheck: chess.inCheck(),
          capturedPieces: getCapturedPieces(game.fen),
        });

        return true;
      } catch (err) {
        console.error('Join multiplayer match error:', err);
        set({ isConnectingMultiplayer: false });
        return false;
      }
    },

    syncMultiplayerState: (remote) => {
      const state = get();
      if (!state.inviteCode) return;

      const isBothPlayersConnected = remote.player_white_id && remote.player_black_id;

      // Only sync if there is actually a change to prevent infinite loops
      if (
        remote.fen === state.fen &&
        remote.turn === state.turn &&
        remote.white_time === state.whiteTime &&
        remote.black_time === state.blackTime &&
        !!remote.is_game_over === state.isGameOver &&
        remote.game_over_reason === state.gameOverReason &&
        remote.winner === state.winner &&
        !!isBothPlayersConnected === state.isMultiplayerGameStarted
      ) {
        return;
      }

      const remoteHistory = remote.history ? JSON.parse(remote.history) : [];
      const remoteFenHistory = remote.fen_history ? JSON.parse(remote.fen_history) : [INITIAL_FEN];
      const opponentMoved = remoteHistory.length > state.history.length;

      let assignedColor = state.playerColor;
      if (remote.player_white_id === state.playerId) {
        assignedColor = 'white';
      } else if (remote.player_black_id === state.playerId) {
        assignedColor = 'black';
      }

      const chess = new Chess(remote.fen);

      set({
        fen: remote.fen,
        board: chess.board(),
        turn: remote.turn,
        history: remoteHistory,
        historyIndex: remoteHistory.length,
        fenHistory: remoteFenHistory,
        lastMove: remote.last_move ? JSON.parse(remote.last_move) : null,
        whiteTime: remote.white_time,
        blackTime: remote.black_time,
        initialTime: remote.initial_time,
        isTimerRunning: isBothPlayersConnected && !remote.is_game_over && remote.initial_time > 0,
        isGameOver: !!remote.is_game_over,
        gameOverReason: remote.game_over_reason,
        winner: remote.winner,
        inCheck: chess.inCheck(),
        capturedPieces: getCapturedPieces(remote.fen),
        playerColor: assignedColor,
        isMultiplayerGameStarted: !!isBothPlayersConnected,
      });

      // Play sound effects if the other player made a move
      if (opponentMoved) {
        const lastRec = remoteHistory[remoteHistory.length - 1];
        const nextIsGameOver = !!remote.is_game_over;
        const nextWinner = remote.winner;
        const nextInCheck = chess.inCheck();

        if (nextIsGameOver) {
          if (nextWinner === 'draw') playSoundFunc('draw');
          else if (nextWinner === assignedColor) playSoundFunc('victory');
          else playSoundFunc('checkmate');
        } else if (nextInCheck) {
          playSoundFunc('check');
        } else if (lastRec.captured) {
          playSoundFunc('capture');
        } else if (lastRec.promotion) {
          playSoundFunc('promotion');
        } else {
          playSoundFunc('move');
        }
      }
    },

    makeMultiplayerMove: async (from, to, promotion) => {
      const state = get();
      if (!state.inviteCode) return false;

      try {
        const res = await fetch(`/api/game/${state.inviteCode}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: state.playerId,
            from,
            to,
            promotion,
          }),
        });

        if (!res.ok) {
          console.error('Server rejected move');
          // Re-fetch state on failure to revert optimistic local state
          const statusRes = await fetch(`/api/game/${state.inviteCode}/status?playerId=${state.playerId}`);
          if (statusRes.ok) {
            const data = await statusRes.json();
            state.syncMultiplayerState(data.game);
          }
          return false;
        }

        const data = await res.json();
        state.syncMultiplayerState(data.game);
        return true;
      } catch (err) {
        console.error('Make multiplayer move error:', err);
        return false;
      }
    },

    resignMultiplayerGame: async () => {
      const state = get();
      if (!state.inviteCode) return;

      try {
        const res = await fetch(`/api/game/${state.inviteCode}/resign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: state.playerId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          state.syncMultiplayerState(data.game);
        }
      } catch (err) {
        console.error('Resign online match error:', err);
      }
    },

    leaveMultiplayerGame: () => {
      set({
        inviteCode: null,
        isMultiplayerGameStarted: false,
        gameMode: 'pvp',
        isGameStarted: false,
      });
    },
  };
});
