import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { Chess } from 'chess.js'

export interface ActivePiece {
  id: string;
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  square: string;
  isCaptured?: boolean;
  capturedAt?: number;
}

/** Parse all pieces from a FEN string, assigning stable unique IDs. */
function parsePiecesFromFen(fen: string): ActivePiece[] {
  const chess = new Chess(fen);
  const board = chess.board();
  const pieces: ActivePiece[] = [];
  const counts: Record<string, number> = {};

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq) {
        const key = `${sq.color}_${sq.type}`;
        counts[key] = (counts[key] || 0) + 1;
        const squareName = String.fromCharCode(97 + c) + (8 - r);
        pieces.push({
          id: `${key}_${counts[key]}`,
          type: sq.type as ActivePiece['type'],
          color: sq.color as ActivePiece['color'],
          square: squareName,
        });
      }
    }
  }
  return pieces;
}

/**
 * Maintains a stable list of ActivePieces that persists piece identities across moves.
 *
 * ✅ FIX: On first render, pieces are derived directly from the current FEN
 * (which may have been restored from localStorage). This eliminates the
 * race condition where `prevPiecesRef` was empty but `fen` was already
 * a restored mid-game FEN, causing a stutter/glitch.
 */
export function useChessPieces() {
  const fen = useGameStore((state) => state.fen);
  const lastMove = useGameStore((state) => state.lastMove);

  // ✅ Initialize immediately from the current FEN so there is no empty-state frame
  const [pieces, setPieces] = useState<ActivePiece[]>(() => parsePiecesFromFen(fen));

  // Store the previous piece list for delta tracking
  const prevPiecesRef = useRef<ActivePiece[]>(pieces);

  // Track whether this is the first update (i.e., after a FEN restore from localStorage)
  const prevFenRef = useRef<string>(fen);

  useEffect(() => {
    const prevFen = prevFenRef.current;
    prevFenRef.current = fen;

    // Count non-captured pieces to check for reset
    const prevCount = prevPiecesRef.current.filter((p) => !p.isCaptured).length;
    const chess = new Chess(fen);
    const newCount = chess.board().flat().filter(Boolean).length;

    // Full reset condition: no active move (e.g. initial load, FEN import) OR returning to start position
    const isFullReset = !lastMove || fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    if (isFullReset && prevFen !== fen) {
      const freshPieces = parsePiecesFromFen(fen);
      setPieces(freshPieces);
      prevPiecesRef.current = freshPieces;
      return;
    }

    // ── Delta tracking for smooth animated moves ──────────────────────────
    const board = chess.board();

    // Build list of pieces needed in the new FEN
    const needed: { type: string; color: string; square: string }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq) {
          const squareName = String.fromCharCode(97 + c) + (8 - r);
          needed.push({ type: sq.type, color: sq.color, square: squareName });
        }
      }
    }

    const workingPieces = [...prevPiecesRef.current];
    const nextPieces: ActivePiece[] = [];
    const usedIds = new Set<string>();

    // Step 0: Retain recently captured pieces that are still within their 600ms animation window
    const now = Date.now();
    const animatingCaptured = prevPiecesRef.current.filter(
      (p) => p.isCaptured && p.capturedAt && (now - p.capturedAt < 600)
    );
    for (const p of animatingCaptured) {
      nextPieces.push(p);
      usedIds.add(p.id);
    }

    // Step 1: Resolve the moving piece first (if we know which square it came from)
    if (lastMove) {
      const movedIdx = workingPieces.findIndex(
        (p) => p.square === lastMove.from && !p.isCaptured && !usedIds.has(p.id)
      );
      if (movedIdx !== -1) {
        const targetInfo = needed.find((n) => n.square === lastMove.to);
        if (targetInfo) {
          workingPieces[movedIdx] = {
            ...workingPieces[movedIdx],
            square: lastMove.to,
            type: targetInfo.type as ActivePiece['type'], // handles promotions
          };
        }
      }
    }

    // Step 1b: Detect if a piece was captured at lastMove.to
    if (lastMove) {
      const prevPieceAtDest = prevPiecesRef.current.find(
        (p) => p.square === lastMove.to && !p.isCaptured
      );
      if (prevPieceAtDest) {
        const stillNeeded = needed.some(
          (n) => n.square === lastMove.to && n.color === prevPieceAtDest.color && n.type === prevPieceAtDest.type
        );
        if (!stillNeeded) {
          const capturedPiece = {
            ...prevPieceAtDest,
            isCaptured: true,
            capturedAt: Date.now(),
          };
          nextPieces.push(capturedPiece);
          usedIds.add(capturedPiece.id);
        }
      }
    }

    // Step 2: Match pieces by exact position (unmoved pieces)
    for (const n of needed) {
      const matchIdx = workingPieces.findIndex(
        (p) => p.color === n.color && p.type === n.type && p.square === n.square && !p.isCaptured && !usedIds.has(p.id)
      );
      if (matchIdx !== -1) {
        nextPieces.push(workingPieces[matchIdx]);
        usedIds.add(workingPieces[matchIdx].id);
      }
    }

    // Step 3: Match remaining pieces by color+type (moved pieces that aren't at target yet)
    for (const n of needed) {
      const alreadyPlaced = nextPieces.some(
        (p) => p.square === n.square && p.type === n.type && p.color === n.color && !p.isCaptured
      );
      if (!alreadyPlaced) {
        const matchIdx = workingPieces.findIndex(
          (p) => p.color === n.color && p.type === n.type && !p.isCaptured && !usedIds.has(p.id)
        );
        if (matchIdx !== -1) {
          const updated = { ...workingPieces[matchIdx], square: n.square };
          nextPieces.push(updated);
          usedIds.add(updated.id);
        } else {
          // Fallback: create a new piece entry
          const key = `${n.color}_${n.type}`;
          const id = `${key}_extra_${Date.now()}`;
          nextPieces.push({
            id,
            color: n.color as ActivePiece['color'],
            type: n.type as ActivePiece['type'],
            square: n.square,
          });
        }
      }
    }

    setPieces(nextPieces);
    prevPiecesRef.current = nextPieces;

    // Schedule a cleanup trigger to remove captured pieces after they finish animating
    const hasCaptured = nextPieces.some((p) => p.isCaptured);
    if (hasCaptured) {
      const cleanupTimer = setTimeout(() => {
        setPieces((curr) => curr.filter((p) => !p.isCaptured || (p.capturedAt && Date.now() - p.capturedAt < 600)));
      }, 610);
      return () => clearTimeout(cleanupTimer);
    }
  }, [fen, lastMove]);

  return pieces;
}
