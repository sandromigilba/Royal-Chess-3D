import { NextResponse } from 'next/server';
import { query } from '@/utils/db';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export async function POST(req: Request) {
  try {
    const { colorChoice, timeMinutes, playerId } = await req.json();

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Generate unique invite code
    let inviteCode = '';
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < 10) {
      inviteCode = generateInviteCode();
      const existing = await query('SELECT id FROM games WHERE invite_code = ?', [inviteCode]);
      codeExists = existing.length > 0;
      attempts++;
    }

    if (codeExists) {
      return NextResponse.json({ error: 'Failed to generate unique invite code' }, { status: 500 });
    }

    // Determine player color assignment
    let playerColor: 'white' | 'black';
    if (colorChoice === 'white') {
      playerColor = 'white';
    } else if (colorChoice === 'black') {
      playerColor = 'black';
    } else {
      playerColor = Math.random() < 0.5 ? 'white' : 'black';
    }

    const player_white_id = playerColor === 'white' ? playerId : null;
    const player_black_id = playerColor === 'black' ? playerId : null;
    const timeSeconds = (timeMinutes || 0) * 60;

    // Insert game session into DB
    await query(
      `INSERT INTO games (
        invite_code, game_mode, fen, turn, player_white_id, player_black_id,
        history, fen_history, white_time, black_time, initial_time,
        is_game_over, last_move_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        inviteCode,
        'multiplayer',
        INITIAL_FEN,
        'w',
        player_white_id,
        player_black_id,
        JSON.stringify([]),
        JSON.stringify([INITIAL_FEN]),
        timeSeconds,
        timeSeconds,
        timeSeconds,
        false,
      ]
    );

    return NextResponse.json({
      inviteCode,
      playerColor,
    });
  } catch (error) {
    console.error('Error in /api/game/create:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
