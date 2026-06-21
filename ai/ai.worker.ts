import { Chess, Move } from 'chess.js'

// Piece values
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece-Square Tables (adapted for centipawns)
const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const PST_ROOK = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const PST_QUEEN = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const PST_KING_MIDDLEGAME = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// Transposition Table (simple cache)
// Key is FEN without move counts, value holds score, depth, best move
interface TtEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'alpha' | 'beta';
  move: Move;
}
const transpositionTable = new Map<string, TtEntry>();

// Evaluation function
function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square) {
        const type = square.type;
        const color = square.color;
        
        // Base piece value
        const val = PIECE_VALUES[type] || 0;

        // Positional value adjustments
        let pstVal = 0;
        const row = color === 'w' ? 7 - r : r; // Invert row for white pieces
        const col = c;

        switch (type) {
          case 'p':
            pstVal = PST_PAWN[row][col];
            break;
          case 'n':
            pstVal = PST_KNIGHT[row][col];
            break;
          case 'b':
            pstVal = PST_BISHOP[row][col];
            break;
          case 'r':
            pstVal = PST_ROOK[row][col];
            break;
          case 'q':
            pstVal = PST_QUEEN[row][col];
            break;
          case 'k':
            pstVal = PST_KING_MIDDLEGAME[row][col];
            break;
        }

        const totalVal = val + pstVal;
        if (color === 'w') {
          score += totalVal;
        } else {
          score -= totalVal;
        }
      }
    }
  }

  // Positive is white advantage, negative is black advantage.
  // Standardize so score is relative to active turn.
  return chess.turn() === 'w' ? score : -score;
}

// Move sorting for alpha-beta move ordering optimization
function getMoveScore(move: Move): number {
  let score = 0;
  
  // Captures: prioritize capturing high-value pieces with low-value pieces (MVV-LVA)
  if (move.captured) {
    const victimVal = PIECE_VALUES[move.captured] || 0;
    const attackerVal = PIECE_VALUES[move.piece] || 0;
    score += 1000 + (victimVal - attackerVal / 10);
  }
  
  // Promotions are highly valuable
  if (move.promotion) {
    score += 900;
  }
  
  // Castling is positive
  if (move.flags && move.flags.includes('k')) {
    score += 50;
  } else if (move.flags && move.flags.includes('q')) {
    score += 40;
  }

  // Avoid moving pieces to attacked squares (simplified heuristic)
  return score;
}

function sortMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => getMoveScore(b) - getMoveScore(a));
}

// Alpha-Beta Negamax search
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number
): { score: number; move: Move | null } {
  
  // Check Transposition Table
  const fenKey = chess.fen().split(' ').slice(0, 4).join(' ');
  const ttEntry = transpositionTable.get(fenKey);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') {
      return { score: ttEntry.score, move: ttEntry.move };
    } else if (ttEntry.flag === 'alpha' && ttEntry.score <= alpha) {
      return { score: alpha, move: ttEntry.move };
    } else if (ttEntry.flag === 'beta' && ttEntry.score >= beta) {
      return { score: beta, move: ttEntry.move };
    }
  }

  // Base cases
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return { score: -25000 - depth, move: null }; // favor faster checkmates
    }
    if (chess.isDraw()) {
      return { score: 0, move: null };
    }
    return { score: evaluateBoard(chess), move: null };
  }

  const rawMoves = chess.moves({ verbose: true });
  if (rawMoves.length === 0) {
    return { score: chess.inCheck() ? -25000 : 0, move: null };
  }

  // Move ordering
  const moves = sortMoves(rawMoves);
  
  let bestMove = null;
  let bestScore = -Infinity;
  const originalAlpha = alpha;

  for (const move of moves) {
    chess.move(move);
    
    // In Negamax, we maximize, and invert/negate the outcome of opponent's node.
    const result = minimax(chess, depth - 1, -beta, -alpha);
    
    chess.undo();

    const score = -result.score;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);

    if (alpha >= beta) {
      break; // Pruning
    }
  }

  // Store in Transposition Table
  let flag: TtEntry['flag'] = 'exact';
  if (bestScore <= originalAlpha) {
    flag = 'alpha';
  } else if (bestScore >= beta) {
    flag = 'beta';
  }

  if (bestMove) {
    transpositionTable.set(fenKey, {
      depth,
      score: bestScore,
      flag,
      move: bestMove
    });
  }

  return { score: bestScore, move: bestMove };
}

// Global calculate entry point
export function calculateBestMove(fen: string, difficulty: string): { from: string; to: string; promotion?: string } {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });

  if (moves.length === 0) return { from: '', to: '' };

  // Beginner mode: 85% random, 15% shallow evaluation
  if (difficulty === 'beginner') {
    if (Math.random() < 0.85) {
      const idx = Math.floor(Math.random() * moves.length);
      return { from: moves[idx].from, to: moves[idx].to, promotion: moves[idx].promotion };
    }
    const result = minimax(chess, 1, -Infinity, Infinity);
    const chosen = result.move || moves[0];
    return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
  }

  // Easy mode: 40% random, 60% shallow evaluation
  if (difficulty === 'easy') {
    if (Math.random() < 0.40) {
      const idx = Math.floor(Math.random() * moves.length);
      return { from: moves[idx].from, to: moves[idx].to, promotion: moves[idx].promotion };
    }
    const result = minimax(chess, 1, -Infinity, Infinity);
    const chosen = result.move || moves[0];
    return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
  }

  // Depth definition based on remaining levels
  let depth = 2; // Normal
  if (difficulty === 'hard') {
    depth = 3;
  } else if (difficulty === 'expert') {
    depth = 4;
  } else if (difficulty === 'master') {
    // If it's master, dynamically choose depth 4 or 5 based on piece counts for speed
    const activePiecesCount = chess.board().flat().filter(Boolean).length;
    depth = activePiecesCount < 10 ? 5 : 4;
  }

  // Execute minimax search
  const result = minimax(chess, depth, -Infinity, Infinity);
  const chosen = result.move || moves[0];
  
  return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
}

// Listening to main thread calculations requests
self.addEventListener('message', (e) => {
  const { fen, difficulty } = e.data;
  const startTime = performance.now();
  
  const move = calculateBestMove(fen, difficulty);
  
  const endTime = performance.now();
  const duration = endTime - startTime;

  // If calculation took less than 200ms, force artificial delay up to 200ms to feel natural to user
  const delay = Math.max(0, 200 - duration);
  
  setTimeout(() => {
    self.postMessage(move);
  }, delay);
});
