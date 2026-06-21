import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useChessPieces } from '../hooks/useChessPieces'
import { ChessPiece3D } from './ChessPiece3D'
import { CapturedPiecesDisplay } from './CapturedPiecesDisplay'
import { squareToCoords, checkIfPromotion } from '../utils/boardUtils'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import type { ThreeEvent } from '@react-three/fiber'

// ─── Board Tile ──────────────────────────────────────────────────────────────

interface BoardTileProps {
  square: string;
  isDark: boolean;
  x: number;
  z: number;
  onClick: (square: string) => void;
}

const BoardTile = React.memo(({ square, isDark, x, z, onClick }: BoardTileProps) => {
  const selectedSquare = useUiStore((state) => state.selectedSquare)
  const hoveredSquare  = useUiStore((state) => state.hoveredSquare)
  const legalMoves     = useUiStore((state) => state.legalMoves)
  const lastMove       = useGameStore((state) => state.lastMove)
  const fen            = useGameStore((state) => state.fen)
  const isAiThinking   = useGameStore((state) => state.isAiThinking)

  const setHoveredSquare = useUiStore((state) => state.setHoveredSquare)

  const isSelected       = selectedSquare === square
  const isHovered        = hoveredSquare === square
  const isLastMoveSrc    = lastMove?.from === square
  const isLastMoveDst    = lastMove?.to === square
  const isLegalDest      = legalMoves.includes(square)

  const hasOpponentPiece = useMemo(() => {
    if (!isLegalDest) return false
    try {
      return !!new Chess(fen).get(square as Square)
    } catch { return false }
  }, [fen, square, isLegalDest])

  const tileColor = useMemo(() => {
    if (isSelected) return '#bae6fd'
    if (isLastMoveSrc || isLastMoveDst) return '#fef08a'
    return isDark ? '#a0aec0' : '#edf2f7'
  }, [isDark, isSelected, isLastMoveSrc, isLastMoveDst])

  const emissive = useMemo(() => {
    if (isSelected) return '#38bdf8'
    if (isLastMoveSrc || isLastMoveDst) return '#facc15'
    return '#000000'
  }, [isSelected, isLastMoveSrc, isLastMoveDst])

  return (
    <group>
      <mesh
        position={[x, -0.025, z]}
        receiveShadow
        castShadow
        onPointerOver={(e) => { e.stopPropagation(); if (!isAiThinking) setHoveredSquare(square) }}
        onPointerOut={(e)  => { e.stopPropagation(); setHoveredSquare(null) }}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (!isAiThinking) onClick(square) }}
      >
        <boxGeometry args={[0.96, 0.05, 0.96]} />
        <meshStandardMaterial
          color={tileColor}
          roughness={isSelected ? 0.1 : (isDark ? 0.16 : 0.12)}
          metalness={isSelected ? 0.3 : 0.18}
          emissive={emissive}
          emissiveIntensity={isSelected ? 0.5 : (isLastMoveSrc || isLastMoveDst ? 0.35 : 0)}
        />
      </mesh>

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <mesh position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.96, 0.96]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {/* Legal move indicators */}
      {isLegalDest && (
        <group>
          {hasOpponentPiece ? (
            <mesh position={[x, 0.01, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.35, 0.025, 8, 24]} />
              <meshStandardMaterial color="#f87171" roughness={0.1} emissive="#f87171" emissiveIntensity={0.6} />
            </mesh>
          ) : (
            <mesh position={[x, 0.015, z]}>
              <cylinderGeometry args={[0.1, 0.1, 0.01, 16]} />
              <meshStandardMaterial color="#475569" roughness={0.2} metalness={0.1} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
})

BoardTile.displayName = 'BoardTile'

// ─── Follow-Cam Controller ───────────────────────────────────────────────────
// Separated into its own component so it can call useThree safely inside Canvas

interface FollowCamProps {
  orbitRef: React.RefObject<OrbitControlsImpl | null>;
  boardGroupRef: React.RefObject<THREE.Group | null>;
}

function FollowCamController({ orbitRef, boardGroupRef }: FollowCamProps) {
  const { camera } = useThree()
  const selectedSquare = useUiStore((state) => state.selectedSquare)
  const followCam      = useUiStore((state) => state.followCam)

  // Camera smooth animation state
  const camTargetPos = useRef(new THREE.Vector3(0, 6.5, 7))
  const camTargetLook = useRef(new THREE.Vector3(0, 0, 0))
  const isAnimating = useRef(false)

  // Save the camera's original position before selection so we can restore it
  const savedCamPos = useRef(new THREE.Vector3(0, 6.5, 7))
  const savedCamLook = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (!followCam) {
      isAnimating.current = false
      return
    }

    if (selectedSquare) {
      // Save current camera position and orbit target before animating
      if (!isAnimating.current && orbitRef.current) {
        savedCamPos.current.copy(camera.position)
        savedCamLook.current.copy(orbitRef.current.target)
      }

      const { x: localX, z: localZ } = squareToCoords(selectedSquare)

      // Determine piece color to set correct camera offset directions
      let isBlack = false
      try {
        const fen = useGameStore.getState().fen
        const chess = new Chess(fen)
        const piece = chess.get(selectedSquare as any)
        isBlack = piece?.color === 'b'
      } catch (err) {
        console.warn(err)
      }

      const zDir = isBlack ? -1 : 1
      const localCamOffset = new THREE.Vector3(localX, 2.2, localZ + zDir * 2.8)
      const localLookOffset = new THREE.Vector3(localX, 0.4, localZ - zDir * 1.2)

      // Transform to world coordinates using board group rotation
      if (boardGroupRef.current) {
        localCamOffset.applyQuaternion(boardGroupRef.current.quaternion)
        localLookOffset.applyQuaternion(boardGroupRef.current.quaternion)
      }

      camTargetPos.current.copy(localCamOffset)
      camTargetLook.current.copy(localLookOffset)
      isAnimating.current = true
    } else {
      // Restore camera to default clean centered position and target
      camTargetPos.current.set(0, 6.5, 7)
      camTargetLook.current.set(0, 0, 0)
      isAnimating.current = true
    }
  }, [selectedSquare, followCam])

  // If followCam is turned OFF, reset animation
  useEffect(() => {
    if (!followCam) {
      isAnimating.current = false
    }
  }, [followCam])

  // Smoothly interpolate the camera
  useFrame((_, delta) => {
    if (!isAnimating.current || !orbitRef.current) return

    const speed = 6 * Math.min(delta, 0.1) // fast responsive transition

    // Lerp camera position
    camera.position.lerp(camTargetPos.current, speed)

    // Lerp orbit target (look-at point)
    orbitRef.current.target.lerp(camTargetLook.current, speed)
    orbitRef.current.update()

    // Stop animating when we get very close to target to allow user manual adjustments
    if (camera.position.distanceTo(camTargetPos.current) < 0.05 && 
        orbitRef.current.target.distanceTo(camTargetLook.current) < 0.05) {
      isAnimating.current = false
    }
  })

  return null
}

// ─── Chess Board ─────────────────────────────────────────────────────────────

export function ChessBoard3D() {
  const boardGroupRef = useRef<THREE.Group>(null)
  const orbitRef      = useRef<OrbitControlsImpl>(null)

  const fen           = useGameStore((state) => state.fen)
  const turn          = useGameStore((state) => state.turn)
  const gameMode      = useGameStore((state) => state.gameMode)
  const playerColor   = useGameStore((state) => state.playerColor)
  const isGameStarted = useGameStore((state) => state.isGameStarted)
  const isAiThinking  = useGameStore((state) => state.isAiThinking)

  const selectedSquare = useUiStore((state) => state.selectedSquare)
  const legalMoves     = useUiStore((state) => state.legalMoves)
  const cameraAngle    = useUiStore((state) => state.cameraAngle)
  const followCam      = useUiStore((state) => state.followCam)

  const boardRotationLocked = useSettingsStore((state) => state.boardRotationLocked)

  const makeMove             = useGameStore((state) => state.makeMove)
  const setSelectedSquare    = useUiStore((state) => state.setSelectedSquare)
  const setLegalMoves        = useUiStore((state) => state.setLegalMoves)
  const setPromotionPendingMove = useUiStore((state) => state.setPromotionPendingMove)
  const setPromotionModalOpen   = useUiStore((state) => state.setPromotionModalOpen)

  const pieces = useChessPieces()

  // Static tile layout — computed once
  const tilesData = useMemo(() => {
    const list = []
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = files[c] + (r + 1)
        const isDark = (r + c) % 2 === 0
        const { x, z } = squareToCoords(square)
        list.push({ square, isDark, x, z })
      }
    }
    return list
  }, [])

  // ── Board rotation logic ───────────────────────────────────────────────────
  useEffect(() => {
    if (boardRotationLocked || (followCam && selectedSquare)) return // Allow rotation reset when deselected in follow-cam

    if (!isGameStarted) {
      useUiStore.getState().setCameraAngle(0)
      return
    }

    if (gameMode === 'pvp') {
      if (!followCam) {
        useUiStore.getState().setCameraAngle(0)
      } else {
        useUiStore.getState().setCameraAngle(turn === 'w' ? 0 : Math.PI)
      }
    } else {
      useUiStore.getState().setCameraAngle(playerColor === 'white' ? 0 : Math.PI)
    }
  }, [turn, gameMode, playerColor, isGameStarted, boardRotationLocked, followCam, selectedSquare])

  // Smooth board Y rotation lerp
  useFrame((_, delta) => {
    if (boardGroupRef.current) {
      boardGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        boardGroupRef.current.rotation.y,
        cameraAngle,
        8 * Math.min(delta, 0.1)
      )
    }
  })

  const handleSquareClick = (square: string) => {
    if (isAiThinking) return

    if (selectedSquare === square) {
      setSelectedSquare(null)
      setLegalMoves([])
      return
    }

    if (legalMoves.includes(square) && selectedSquare) {
      const chess = new Chess(fen)
      const isPromotion = checkIfPromotion(chess, selectedSquare, square)

      if (isPromotion) {
        setPromotionPendingMove({ from: selectedSquare, to: square })
        setPromotionModalOpen(true)
      } else {
        makeMove(selectedSquare, square)
        setSelectedSquare(null)
        setLegalMoves([])
      }
      return
    }

    try {
      const chess = new Chess(fen)
      const piece = chess.get(square as Square)

      const activeSelectableColor = gameMode === 'pvp'
        ? turn
        : (playerColor === 'white' ? 'w' : 'b')

      if (piece && piece.color === activeSelectableColor && turn === activeSelectableColor) {
        setSelectedSquare(square)
        const moves = chess.moves({ square: square as Square, verbose: true })
        setLegalMoves(moves.map((m) => m.to))
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    } catch {
      setSelectedSquare(null)
      setLegalMoves([])
    }
  }

  return (
    <group>
      {/* Orbit camera controls — disabled pan in follow-cam mode */}
      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={3}
        maxDistance={14}
        enablePan={!followCam}
        makeDefault
      />

      {/* Follow-cam controller (inside Canvas so useThree works) */}
      <FollowCamController orbitRef={orbitRef} boardGroupRef={boardGroupRef} />

      {/* Lighting rig */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#e8eaed', '#c5cdd8', 0.45]} />
      <directionalLight
        position={[5, 12, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-7.5}
        shadow-camera-right={7.5}
        shadow-camera-top={7.5}
        shadow-camera-bottom={-7.5}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
      />
      {/* Fill lights for crystal/metal reflections - wider and more intense */}
      <pointLight position={[-5, 8, -5]} intensity={1.4} decay={0.8} distance={40} color="#dde8ff" />
      <pointLight position={[5, 6, 5]} intensity={1.0} decay={0.8} distance={40} color="#fff5e0" />
      <pointLight position={[0, 4.5, -6]} intensity={1.1} decay={0.8} distance={30} color="#e0f2fe" />
      <spotLight position={[0, 11, 0]} intensity={1.8} angle={1.4} penumbra={0.7} decay={0.7} />

      {/* Rotating board group */}
      <group ref={boardGroupRef}>
        {/* Board base */}
        <mesh position={[0, -0.07, 0]} receiveShadow castShadow>
          <boxGeometry args={[8.4, 0.09, 8.4]} />
          <meshStandardMaterial color="#f0f4f8" roughness={0.08} metalness={0.15} envMapIntensity={1.0} />
        </mesh>

        {/* Shadow plane */}
        <mesh position={[0, -0.116, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <shadowMaterial opacity={0.28} />
        </mesh>

        {/* 64 squares */}
        {tilesData.map((tile) => (
          <BoardTile
            key={tile.square}
            square={tile.square}
            isDark={tile.isDark}
            x={tile.x}
            z={tile.z}
            onClick={handleSquareClick}
          />
        ))}

        {/* Pieces */}
        {pieces.map((piece) => (
          <ChessPiece3D
            key={piece.id}
            id={piece.id}
            type={piece.type}
            color={piece.color}
            square={piece.square}
            onSelect={handleSquareClick}
            isCaptured={piece.isCaptured}
            capturedAt={piece.capturedAt}
          />
        ))}

        {/* Captured Pieces display */}
        <CapturedPiecesDisplay />
      </group>
    </group>
  )
}
