import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import {
  PawnGeometry,
  RookGeometry,
  KnightGeometry,
  BishopGeometry,
  QueenGeometry,
} from './PieceGeometries'

// ─── Types ────────────────────────────────────────────────────────────────────

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q'
type PieceColor = 'w' | 'b'
type CaptureCount = { p: number; n: number; b: number; r: number; q: number }

// Piece rendering order: most valuable first (queen → rook → bishop → knight → pawn)
const PIECE_ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p']

// Scale down captured pieces relative to board pieces
const SCALE   = 0.40
const SPACING = 0.50  // gap between each piece
const Z_OFFSET = 5.1  // how far behind the board edge

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Expands count-based capture record into a flat ordered list */
function buildPieceList(counts: CaptureCount): PieceType[] {
  const result: PieceType[] = []
  for (const type of PIECE_ORDER) {
    for (let i = 0; i < counts[type]; i++) {
      result.push(type)
    }
  }
  return result
}

// ─── Single captured piece ────────────────────────────────────────────────────

function SmallPiece({ type, color }: { type: PieceType; color: PieceColor }) {
  const props = { color, hovered: false, selected: false, checking: false }
  const yRot = type === 'n' ? (color === 'w' ? 0 : Math.PI) : 0
  return (
    <group rotation={[0, yRot, 0]}>
      {type === 'p' && <PawnGeometry   {...props} />}
      {type === 'r' && <RookGeometry   {...props} />}
      {type === 'n' && <KnightGeometry {...props} />}
      {type === 'b' && <BishopGeometry {...props} />}
      {type === 'q' && <QueenGeometry  {...props} />}
    </group>
  )
}

// ─── One row of captured pieces ───────────────────────────────────────────────

function CaptureRow({
  pieces,
  color,
  zPos,
}: {
  pieces: PieceType[]
  color: PieceColor
  zPos: number
}) {
  if (pieces.length === 0) return null

  // Centre the row on x = 0
  const totalWidth = (pieces.length - 1) * SPACING
  const startX = -totalWidth / 2

  return (
    <group>
      {/* Thin glass-like tray / platform (Y = -0.03, height = 0.025) */}
      <mesh position={[0, -0.03, zPos]} receiveShadow castShadow>
        <boxGeometry args={[Math.max(pieces.length * SPACING + 0.3, 1.2), 0.025, 0.72]} />
        <meshStandardMaterial
          color={color === 'w' ? '#e2e6ea' : '#2c2f33'}
          roughness={0.3}
          metalness={0.15}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Invisible shadow catcher plane just above the tray top surface to capture the pieces' shadows */}
      <mesh position={[0, -0.017, zPos]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.max(pieces.length * SPACING + 0.3, 1.2), 0.72]} />
        <shadowMaterial opacity={0.32} />
      </mesh>

      {/* Pieces resting exactly on top of the tray (Y = -0.0175) */}
      {pieces.map((type, i) => (
        <group
          key={`cap_${color}_${type}_${i}`}
          position={[startX + i * SPACING, -0.0175, zPos]}
          scale={[SCALE, SCALE, SCALE]}
        >
          <SmallPiece type={type} color={color} />
        </group>
      ))}
    </group>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Renders captured pieces on both sides of the board.
 *
 * Placement logic (board coordinate system, before rotation):
 *  - z = +Z_OFFSET : behind white's back rank  → shows black pieces white captured
 *  - z = -Z_OFFSET : behind black's back rank  → shows white pieces black captured
 *
 * Because this component lives inside the boardGroupRef in ChessBoard3D,
 * it rotates with the board automatically — captured pieces always stay
 * "in front of" the correct player regardless of board rotation.
 */
export function CapturedPiecesDisplay() {
  const capturedPieces = useGameStore((state) => state.capturedPieces)
  const isGameStarted  = useGameStore((state) => state.isGameStarted)

  // capturedPieces.w = black pieces that white captured → render as 'b' color on white's side
  const whiteSideCaptures = useMemo(
    () => buildPieceList(capturedPieces.w),
    [capturedPieces.w]
  )
  // capturedPieces.b = white pieces that black captured → render as 'w' color on black's side
  const blackSideCaptures = useMemo(
    () => buildPieceList(capturedPieces.b),
    [capturedPieces.b]
  )

  if (!isGameStarted) return null

  return (
    <group>
      {/* Behind white (positive Z) — black pieces white captured */}
      <CaptureRow pieces={whiteSideCaptures} color="b" zPos={+Z_OFFSET} />

      {/* Behind black (negative Z) — white pieces black captured */}
      <CaptureRow pieces={blackSideCaptures} color="w" zPos={-Z_OFFSET} />
    </group>
  )
}
