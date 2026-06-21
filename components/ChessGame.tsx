'use client'

import { useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { AppLayout } from '../layouts/AppLayout'
import { ChessBoard3D } from '../game/ChessBoard3D'
import { NewGameModal } from './NewGameModal'
import { SettingsModal } from './SettingsModal'
import { PromotionModal } from './PromotionModal'
import { GameOverModal } from './GameOverModal'
import { MultiplayerInvite } from './MultiplayerInvite'
import { useGameStore, setSoundPlayer } from '../store/gameStore'
import { initAiManager } from '../ai/aiManager'
import { playSound } from '../services/soundSynth'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'

export default function ChessGame() {
  const loadGame = useGameStore((state) => state.loadGame)
  const gameMode = useGameStore((state) => state.gameMode)
  const inviteCode = useGameStore((state) => state.inviteCode)
  const isGameOver = useGameStore((state) => state.isGameOver)
  const playerId = useGameStore((state) => state.playerId)
  const syncMultiplayerState = useGameStore((state) => state.syncMultiplayerState)

  useEffect(() => {
    // 1. Register audio synth as the sound callback
    setSoundPlayer(playSound)

    // 2. Initialize Chess AI (Web Worker or main-thread fallback)
    initAiManager()

    // 3. Restore last session from localStorage
    const restored = loadGame()
    if (!restored) {
      useUiStore.getState().setNewGameModalOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount only

  // Multiplayer status polling loop
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !inviteCode || isGameOver) return

    let active = true

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/game/${inviteCode}/status?playerId=${playerId}`)
        if (!res.ok) return
        const data = await res.json()
        if (active && data.game) {
          syncMultiplayerState(data.game)
        }
      } catch (err) {
        console.error('Error polling match status:', err)
      }
    }

    // Run poll immediately on enter, then repeat every 1.5s
    pollStatus()
    const intervalId = setInterval(pollStatus, 1500)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [gameMode, inviteCode, isGameOver, playerId, syncMultiplayerState])

  const backgroundTheme = useSettingsStore((state) => state.backgroundTheme)

  const getBackgroundConfig = () => {
    switch (backgroundTheme) {
      case 'dark-white':
        return {
          className: "w-screen h-screen overflow-hidden select-none bg-gradient-to-br from-[#d2d7df] to-[#eef1f6]",
          style: {}
        }
      case 'cloudy-sky':
        return {
          className: "w-screen h-screen overflow-hidden select-none bg-neutral-200",
          style: {
            backgroundImage: 'url(/cloudy_sky.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }
        }
      case 'default':
      default:
        return {
          className: "w-screen h-screen overflow-hidden select-none bg-neutral-100",
          style: {}
        }
    }
  }

  const bgConfig = getBackgroundConfig()

  return (
    <div className={bgConfig.className} style={bgConfig.style}>
      <AppLayout>
        {/* React Three Fiber 3D Canvas */}
        <Canvas
          shadows
          camera={{ position: [0, 6.5, 7], fov: 50 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <ChessBoard3D />
          </Suspense>
        </Canvas>
      </AppLayout>

      {/* Overlay Modals */}
      <NewGameModal />
      <SettingsModal />
      <PromotionModal />
      <GameOverModal />
      <MultiplayerInvite />
    </div>
  )
}
