import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();
    const { playerId } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Fetch the game
    const games = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    if (game.is_game_over) {
      return NextResponse.json({ error: 'Game is already over' }, { status: 400 });
    }

    // Identify which color is resigning
    let winner: 'white' | 'black' | null = null;

    if (game.player_white_id === playerId) {
      winner = 'black'; // White resigns, Black wins
    } else if (game.player_black_id === playerId) {
      winner = 'white'; // Black resigns, White wins
    } else {
      return NextResponse.json({ error: 'Player not registered in this game' }, { status: 403 });
    }

    // Update game status
    await query(
      `UPDATE games SET 
        is_game_over = true, 
        winner = ?, 
        game_over_reason = 'resigned'
       WHERE invite_code = ?`,
      [winner, cleanCode]
    );

    const updatedGames = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    return NextResponse.json({ game: updatedGames[0] });
  } catch (error) {
    console.error('Error in /api/game/[code]/resign:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
