import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();

    const games = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    // Compute active remaining time for polling client
    let whiteTime = game.white_time;
    let blackTime = game.black_time;
    let isGameOver = !!game.is_game_over;
    let winner = game.winner;
    let gameOverReason = game.game_over_reason;

    if (
      !game.is_game_over &&
      game.player_white_id &&
      game.player_black_id &&
      game.initial_time > 0 &&
      game.last_move_at
    ) {
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
          isGameOver = true;
          winner = isWhiteTurn ? 'black' : 'white';
          gameOverReason = 'timeout';

          // Commit timeout to database
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
        }
      }
    }

    // Prepare response payload matching database schema with adjusted timers
    const gamePayload = {
      ...game,
      white_time: whiteTime,
      black_time: blackTime,
      is_game_over: isGameOver ? 1 : 0,
      winner,
      game_over_reason: gameOverReason,
    };

    return NextResponse.json({ game: gamePayload });
  } catch (error) {
    console.error('Error in /api/game/[code]/status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
