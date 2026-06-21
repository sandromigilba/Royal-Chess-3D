import { Chess } from 'chess.js'
import type { Square } from 'chess.js'

/**
 * Converts chess algebraic notation (e.g., "e4") to 3D board coordinates.
 * The board center is at (0,0). X-axis represents files (a to h), Z-axis represents ranks (1 to 8).
 * a1 is at X = -3.5, Z = 3.5
 * h8 is at X = 3.5, Z = -3.5
 */
export function squareToCoords(square: string): { x: number; z: number } {
  if (!square || typeof square !== 'string' || square.length < 2) return { x: 0, z: 0 };
  
  const file = square.charCodeAt(0) - 97; // 'a' -> 0, 'h' -> 7
  const rank = parseInt(square.charAt(1)) - 1; // '1' -> 0, '8' -> 7
  
  const x = file - 3.5;
  const z = 3.5 - rank;
  
  return { x, z };
}

/**
 * Converts 3D coordinates back to chess algebraic notation (e.g. "e4").
 */
export function coordsToSquare(x: number, z: number): string {
  const fileIdx = Math.max(0, Math.min(7, Math.round(x + 3.5)));
  const rankIdx = Math.max(0, Math.min(7, Math.round(3.5 - z)));
  
  const file = String.fromCharCode(fileIdx + 97); // 0 -> 'a'
  const rank = (rankIdx + 1).toString(); // 0 -> '1'
  
  return file + rank;
}

/**
 * Checks if a move is a pawn promotion move.
 */
export function checkIfPromotion(chess: Chess, from: string, to: string): boolean {
  try {
    const piece = chess.get(from as Square);
    if (!piece || piece.type !== 'p') return false;
    
    const rank = to.charAt(1);
    if (piece.color === 'w' && rank === '8') return true;
    if (piece.color === 'b' && rank === '1') return true;
    
    return false;
  } catch {
    return false;
  }
}
