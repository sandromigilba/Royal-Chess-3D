import { useRef, useMemo, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { squareToCoords } from '../utils/boardUtils'
import {
  PawnGeometry,
  RookGeometry,
  KnightGeometry,
  BishopGeometry,
  QueenGeometry,
  KingGeometry
} from './PieceGeometries'
import { useUiStore } from '../store/uiStore'
import { useGameStore } from '../store/gameStore'

interface ChessPiece3DProps {
  id: string;
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  square: string;
  onSelect: (square: string) => void;
  isCaptured?: boolean;
  capturedAt?: number;
}

// Drop-from-above animation constants
const DROP_START_HEIGHT = 3.2   // height pieces drop from (units above board)
const DROP_DURATION     = 0.55  // seconds to fully land
const DROP_SPEED        = 1 / DROP_DURATION

export const ChessPiece3D = memo(({ type, color, square, onSelect, isCaptured = false, capturedAt }: ChessPiece3DProps) => {
  const groupRef = useRef<THREE.Group>(null)

  const selectedSquare = useUiStore((state) => state.selectedSquare)
  const hoveredSquare  = useUiStore((state) => state.hoveredSquare)
  const isAiThinking   = useGameStore((state) => state.isAiThinking)
  const inCheck        = useGameStore((state) => state.inCheck)
  const turn           = useGameStore((state) => state.turn)

  const isSelected = selectedSquare === square
  const isHovered  = hoveredSquare === square
  const isChecking = inCheck && type === 'k' && color === turn

  const { x: targetX, z: targetZ } = squareToCoords(square)
  const baseTargetY = isSelected ? 0.25 : 0

  // ── Drop animation state ─────────────────────────────────────────────────
  const prevSquareRef  = useRef(square)
  const dropProgressRef = useRef(1) // 1 = fully landed

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // ── Capture animation: slide backward, shrink, and fade out ────────────
    if (isCaptured && capturedAt) {
      const progress = Math.min(1, (Date.now() - capturedAt) / 600);
      const dir = color === 'w' ? 1 : -1; // White goes +Z, Black goes -Z
      const slideDist = 1.6 * progress;

      groupRef.current.position.x = targetX;
      groupRef.current.position.z = targetZ + dir * slideDist;
      groupRef.current.position.y = baseTargetY - 0.25 * progress;

      const scale = 1 - progress;
      groupRef.current.scale.set(scale, scale, scale);

      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshPhysicalMaterial;
          mat.transparent = true;
          const baseOpacity = color === 'w' ? 0.80 : 0.72;
          mat.opacity = baseOpacity * (1 - progress);
        }
      });
      return;
    }

    // ── Detect square change → snap XZ, reset drop ────────────────────────
    if (prevSquareRef.current !== square) {
      // Instantly teleport to target XZ, start high above
      groupRef.current.position.x = targetX
      groupRef.current.position.z = targetZ
      groupRef.current.position.y = DROP_START_HEIGHT
      dropProgressRef.current = 0
      prevSquareRef.current = square
    }

    const t = dropProgressRef.current

    if (t < 1) {
      // ── Dropping: advance progress ───────────────────────────────────────
      dropProgressRef.current = Math.min(1, t + delta * DROP_SPEED)
      const p = dropProgressRef.current

      // Ease-out cubic: starts fast, decelerates near landing
      const ease = 1 - Math.pow(1 - p, 3)

      groupRef.current.position.y = THREE.MathUtils.lerp(DROP_START_HEIGHT, baseTargetY, ease)

      // XZ stays snapped — no lateral movement needed
      groupRef.current.position.x = targetX
      groupRef.current.position.z = targetZ

    } else {
      // ── Landed: settle to final Y (handles select/deselect float) ────────
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y, baseTargetY, 14 * Math.min(delta, 0.1)
      )
      // Reset scale and opacity if recycled
      groupRef.current.scale.set(1, 1, 1);
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshPhysicalMaterial;
          mat.opacity = color === 'w' ? 0.80 : 0.72;
        }
      });
    }
  })

  // Knights face toward their opponent
  const yRotation = useMemo(() => {
    if (type === 'n') return color === 'w' ? 0 : Math.PI
    return 0
  }, [type, color])

  const renderGeometry = () => {
    const geomProps = { color, hovered: isHovered, selected: isSelected, checking: isChecking }
    switch (type) {
      case 'p': return <PawnGeometry   {...geomProps} />
      case 'r': return <RookGeometry   {...geomProps} />
      case 'n': return <KnightGeometry {...geomProps} />
      case 'b': return <BishopGeometry {...geomProps} />
      case 'q': return <QueenGeometry  {...geomProps} />
      case 'k': return <KingGeometry   {...geomProps} />
      default:  return null
    }
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isAiThinking || isCaptured) return
    onSelect(square)
  }

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      rotation={[0, yRotation, 0]}
      // Set initial JSX position so piece appears instantly at correct square on mount
      position={[targetX, baseTargetY, targetZ]}
    >
      {renderGeometry()}
    </group>
  )
})

ChessPiece3D.displayName = 'ChessPiece3D'
