import { NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { query } from '@/utils/db';

interface MoveRecord {
  from: string;
  to: string;
  san: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
  promotion?: string;
  timestamp: number;
}

function deriveGameOver(chess: Chess, previousTurn: 'w' | 'b'): {
  isGameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  gameOverReason: 'checkmate' | 'stalemate' | 'threefold' | 'insufficient' | 'fifty_moves' | 'timeout' | null;
} {
  if (chess.isCheckmate()) {
    return {
      isGameOver: true,
      winner: previousTurn === 'w' ? 'white' : 'black',
      gameOverReason: 'checkmate',
    };
  }
  if (chess.isStalemate()) return { isGameOver: true, winner: 'draw', gameOverReason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { isGameOver: true, winner: 'draw', gameOverReason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { isGameOver: true, winner: 'draw', gameOverReason: 'threefold' };
  if (chess.isDraw()) return { isGameOver: true, winner: 'draw', gameOverReason: 'fifty_moves' };
  return { isGameOver: false, winner: null, gameOverReason: null };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();
    const { playerId, from, to, promotion } = await req.json();

    if (!playerId || !from || !to) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch the game
    const games = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    if (game.is_game_over) {
      return NextResponse.json({ error: 'Game has already ended' }, { status: 400 });
    }

    if (!game.player_white_id || !game.player_black_id) {
      return NextResponse.json({ error: 'Waiting for opponent to join' }, { status: 400 });
    }

    // Verify turn authorization
    const activeColor = game.turn;
    const activePlayerId = activeColor === 'w' ? game.player_white_id : game.player_black_id;

    if (activePlayerId !== playerId) {
      return NextResponse.json({ error: 'It is not your turn' }, { status: 403 });
    }

    // Calculate elapsed time and update timers
    let whiteTime = game.white_time;
    let blackTime = game.black_time;
    let isGameOver = false;
    let winner: 'white' | 'black' | 'draw' | null = null;
    let gameOverReason: typeof game.game_over_reason = null;

    if (game.initial_time > 0 && game.last_move_at) {
      const now = new Date();
      const lastMoveAt = new Date(game.last_move_at);
      const elapsedSeconds = Math.floor((now.getTime() - lastMoveAt.getTime()) / 1000);

      if (elapsedSeconds > 0) {
        const isWhiteTurn = game.turn === 'w';
        const activeTime = isWhiteTurn ? game.white_time : game.black_time;
        const newTime = Math.max(0, activeTime - elapsedSeconds);

        if (isWhiteTurn) {
          whiteTime = newTime;
        } else {
          blackTime = newTime;
        }

        if (newTime === 0) {
          // Timeout occurred before this move could be processed
          isGameOver = true;
          winner = isWhiteTurn ? 'black' : 'white';
          gameOverReason = 'timeout';

          await query(
            `UPDATE games SET 
              white_time = ?, 
              black_time = ?, 
              is_game_over = true, 
              winner = ?, 
              game_over_reason = 'timeout' 
             WHERE invite_code = ?`,
            [whiteTime, blackTime, winner, cleanCode]
          );

          const updatedGames = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
          return NextResponse.json({ game: updatedGames[0] });
        }
      }
    }

    // Validate move using chess.js
    const chess = new Chess(game.fen);
    let moveResult;
    try {
      moveResult = chess.move({ from, to, promotion });
    } catch (e) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    if (!moveResult) {
      return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
    }

    // Move is valid. Apply state updates.
    const nextFen = chess.fen();
    const nextTurn = chess.turn();

    // Parse and update move history arrays
    const history: MoveRecord[] = game.history ? JSON.parse(game.history) : [];
    const fenHistory: string[] = game.fen_history ? JSON.parse(game.fen_history) : [];

    const newRecord: MoveRecord = {
      from,
      to,
      san: moveResult.san,
      color: moveResult.color,
      piece: moveResult.piece,
      captured: moveResult.captured,
      promotion: moveResult.promotion,
      timestamp: Date.now(),
    };

    history.push(newRecord);
    fenHistory.push(nextFen);

    // Check if the move ended the game
    const gameResult = deriveGameOver(chess, game.turn);
    if (gameResult.isGameOver) {
      isGameOver = true;
      winner = gameResult.winner;
      gameOverReason = gameResult.gameOverReason;
    }

    // Commit new game state to database
    await query(
      `UPDATE games SET 
        fen = ?,
        turn = ?,
        history = ?,
        fen_history = ?,
        last_move = ?,
        white_time = ?,
        black_time = ?,
        is_game_over = ?,
        winner = ?,
        game_over_reason = ?,
        last_move_at = CURRENT_TIMESTAMP
       WHERE invite_code = ?`,
      [
        nextFen,
        nextTurn,
        JSON.stringify(history),
        JSON.stringify(fenHistory),
        JSON.stringify({ from, to }),
        whiteTime,
        blackTime,
        isGameOver ? 1 : 0,
        winner,
        gameOverReason,
        cleanCode,
      ]
    );

    const finalGames = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    return NextResponse.json({ game: finalGames[0] });
  } catch (error) {
    console.error('Error in /api/game/[code]/move:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
