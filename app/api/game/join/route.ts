import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

export async function POST(req: Request) {
  try {
    const { inviteCode, playerId } = await req.json();

    if (!inviteCode || !playerId) {
      return NextResponse.json({ error: 'Invite code and Player ID are required' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // Fetch the game
    const games = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found. Please check the code.' }, { status: 404 });
    }

    const game = games[0];

    // Check if player is already in this game
    if (game.player_white_id === playerId) {
      return NextResponse.json({ playerColor: 'white', game });
    }
    if (game.player_black_id === playerId) {
      return NextResponse.json({ playerColor: 'black', game });
    }

    // Try to join
    let playerColor: 'white' | 'black';
    let updateQuery = '';
    const params = [];

    if (!game.player_white_id) {
      playerColor = 'white';
      updateQuery = 'UPDATE games SET player_white_id = ?';
      params.push(playerId);
    } else if (!game.player_black_id) {
      playerColor = 'black';
      updateQuery = 'UPDATE games SET player_black_id = ?';
      params.push(playerId);
    } else {
      return NextResponse.json({ error: 'This match is already full.' }, { status: 403 });
    }

    // If both players are now connected, initialize the timer tracking
    const bothConnected =
      (playerColor === 'white' && game.player_black_id) ||
      (playerColor === 'black' && game.player_white_id);

    if (bothConnected) {
      updateQuery += ', last_move_at = CURRENT_TIMESTAMP';
    }

    updateQuery += ' WHERE invite_code = ?';
    params.push(cleanCode);

    await query(updateQuery, params);

    // Fetch the updated game state to return
    const updatedGames = await query('SELECT * FROM games WHERE invite_code = ?', [cleanCode]);
    const updatedGame = updatedGames[0];

    return NextResponse.json({
      playerColor,
      game: updatedGame,
    });
  } catch (error) {
    console.error('Error in /api/game/join:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
