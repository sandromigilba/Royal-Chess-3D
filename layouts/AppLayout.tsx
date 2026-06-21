import React, { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAudioStore } from '../store/audioStore'
import { 
  Plus, Undo2, Redo2, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, Copy, Check, Clock, ShieldAlert, FileText, ChevronRight, Cctv
} from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Game state values
  const {
    fen,
    turn,
    gameMode,
    isAiThinking,
    isGameStarted, // ✅ NEW
    history,
    historyIndex,
    whiteTime,
    blackTime,
    initialTime,
    isGameOver,
    inCheck,
    capturedPieces,
    undoMove,
    redoMove,
    restartGame,
    tickTimers,
    importFen,
    exportFen,
    exportPgn,
    claimDraw,
    inviteCode,
    playerColor,
    resignMultiplayerGame
  } = useGameStore()

  // UI state values
  const {
    isFullscreen,
    setIsFullscreen,
    setNewGameModalOpen,
    setSettingsModalOpen,
    setSelectedSquare,
    setLegalMoves,
    followCam,
    toggleFollowCam,
  } = useUiStore()

  const { aiDifficulty } = useSettingsStore()
  const { soundEnabled, setSoundEnabled } = useAudioStore()

  const [copiedText, setCopiedText] = useState<'fen' | 'pgn' | null>(null)
  const [importText, setImportText] = useState('')

  // 1. Timer countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      tickTimers()
    }, 1000)
    return () => clearInterval(timer)
  }, [tickTimers])

  // 2. Fullscreen event listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [setIsFullscreen])

  // 3. Fullscreen toggle function
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn(err))
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
    }
  }

  // 4. Material Evaluation Score (White sum - Black sum)
  const evalScore = useMemo(() => {
    // Standard chess piece values
    const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
    let score = 0
    // Parse FEN to count remaining pieces
    const position = fen.split(' ')[0]
    for (const char of position) {
      if (char === '/') continue
      const low = char.toLowerCase()
      if (vals[low] !== undefined) {
        const value = vals[low]
        if (char === char.toUpperCase()) {
          score += value // White piece
        } else {
          score -= value // Black piece
        }
      }
    }
    return score
  }, [fen])

  // Helper to format remaining timer seconds to mm:ss
  const formatTime = (secs: number) => {
    if (secs <= 0) return '00:00'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // FEN copy action
  const handleCopyFen = () => {
    navigator.clipboard.writeText(exportFen())
    setCopiedText('fen')
    setTimeout(() => setCopiedText(null), 1800)
  }

  // PGN copy action
  const handleCopyPgn = () => {
    navigator.clipboard.writeText(exportPgn())
    setCopiedText('pgn')
    setTimeout(() => setCopiedText(null), 1800)
  }

  // Handle direct custom FEN/PGN string import
  const handleImport = () => {
    if (!importText) return
    const success = importFen(importText.trim())
    if (success) {
      setImportText('')
      setSelectedSquare(null)
      setLegalMoves([])
    } else {
      alert('Invalid FEN coordinate string!')
    }
  }

  // Render icons for captured pieces lists
  const renderCapturedGroup = (list: typeof capturedPieces.w, color: 'w' | 'b') => {
    const symbols: Record<string, string> = { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }
    const items: React.ReactNode[] = []
    
    Object.entries(list).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        items.push(
          <span 
            key={`${color}_captured_${type}_${i}`} 
            className={`text-xl leading-none ${color === 'w' ? 'text-neutral-800' : 'text-neutral-400'}`}
            title={type.toUpperCase()}
          >
            {symbols[type]}
          </span>
        )
      }
    })

    if (items.length === 0) return <span className="text-xs text-neutral-400 italic">none</span>
    return <div className="flex flex-wrap gap-0.5">{items}</div>
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      
      {/* 1. FLOATING NAVBAR */}
      <header className="absolute top-5 left-5 right-5 z-40">
        <div className="w-full max-w-7xl mx-auto py-3 px-6 glass-panel rounded-chess flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white font-extrabold text-sm tracking-tighter">
              R
            </div>
            <span className="font-bold text-neutral-800 tracking-tight hidden sm:inline">
              Royal Chess 3D
            </span>
          </div>

          {/* Quick actions controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setNewGameModalOpen(true)}
              className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-semibold rounded-chess bg-neutral-950 text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>

            <div className="w-px h-5 bg-neutral-200/60 mx-1.5 hidden md:block" />

            <button
              onClick={undoMove}
              disabled={historyIndex === 0 || isAiThinking || gameMode === 'multiplayer'}
              title="Undo Move"
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 disabled:opacity-35 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={redoMove}
              disabled={historyIndex >= history.length || isAiThinking || gameMode === 'multiplayer'}
              title="Redo Move"
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 disabled:opacity-35 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              onClick={restartGame}
              disabled={historyIndex === 0 || isAiThinking || gameMode === 'multiplayer'}
              title="Restart Game"
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 disabled:opacity-35 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-neutral-200/60 mx-1.5" />

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute' : 'Unmute'}
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleFollowCam}
              title={followCam ? 'Follow-Cam: ON — click to turn off' : 'Follow-Cam: OFF — track behind moved piece'}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                followCam
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'hover:bg-neutral-200/50 text-neutral-600'
              }`}
            >
              <Cctv className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              title="Game Settings"
              className="p-2 rounded-full hover:bg-neutral-200/50 text-neutral-600 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN 3D CENTER STAGE */}
      <main className="absolute inset-0 z-0">
        {children}
      </main>

      {/* 3. FLOATING SIDE PANEL */}
      <aside className="absolute right-5 top-24 bottom-24 w-80 z-30 hidden lg:flex flex-col gap-4">
        
        {/* MATCH DETAILS PANEL */}
        <div className="flex-1 glass-panel rounded-chess p-5 flex flex-col overflow-hidden">
          
          {/* Active clocks and turn summary */}
          <div className="pb-4 border-b border-neutral-200/40 space-y-3.5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                  Current Turn
                </span>
                <span className="text-sm font-bold text-neutral-800 flex items-center gap-1.5 mt-0.5">
                  <span className={`w-3 h-3 rounded-full border ${
                    turn === 'w' ? 'bg-white border-neutral-400' : 'bg-neutral-900 border-neutral-900'
                  }`} />
                  {turn === 'w' ? 'White' : 'Black'}
                  {gameMode === 'multiplayer' && ` (You: ${playerColor})`}
                  {isAiThinking && (
                    <span className="text-xs font-normal text-neutral-500 animate-pulse">
                      (thinking...)
                    </span>
                  )}
                </span>
              </div>

              {gameMode === 'ai' && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    Opponent
                  </span>
                  <span className="text-xs font-semibold text-neutral-600 block mt-0.5">
                    AI ({aiDifficulty})
                  </span>
                </div>
              )}
              {gameMode === 'multiplayer' && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                    Match Room
                  </span>
                  <span className="text-xs font-bold text-neutral-900 block mt-0.5">
                    Code: {inviteCode}
                  </span>
                </div>
              )}
            </div>

            {/* Timer Displays */}
            {initialTime > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* White clock */}
                <div className={`p-2.5 rounded-chess border transition-all flex flex-col items-center justify-center ${
                  turn === 'w' 
                    ? 'bg-neutral-900/5 border-neutral-900/10' 
                    : 'bg-white/40 border-neutral-200/60'
                }`}>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 flex items-center gap-1 justify-center">
                    <Clock className="w-2.5 h-2.5" /> White
                  </span>
                  <span className={`text-lg font-bold font-mono ${
                    turn === 'w' ? 'text-neutral-900' : 'text-neutral-500'
                  }`}>
                    {formatTime(whiteTime)}
                  </span>
                </div>

                {/* Black clock */}
                <div className={`p-2.5 rounded-chess border transition-all flex flex-col items-center justify-center ${
                  turn === 'b' 
                    ? 'bg-neutral-900/5 border-neutral-900/10' 
                    : 'bg-white/40 border-neutral-200/60'
                }`}>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400 flex items-center gap-1 justify-center">
                    <Clock className="w-2.5 h-2.5" /> Black
                  </span>
                  <span className={`text-lg font-bold font-mono ${
                    turn === 'b' ? 'text-neutral-900' : 'text-neutral-500'
                  }`}>
                    {formatTime(blackTime)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Captured Pieces list view */}
          <div className="py-3.5 border-b border-neutral-200/40 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
              Captured Pieces
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-500">By White:</span>
                {renderCapturedGroup(capturedPieces.w, 'w')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-500">By Black:</span>
                {renderCapturedGroup(capturedPieces.b, 'b')}
              </div>
            </div>
          </div>

          {/* Live Chess Engine Evaluation score */}
          <div className="py-3.5 border-b border-neutral-200/40 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
              Material Balance
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden relative">
                {/* Visual bar scaled between white (+10) and black (-10) */}
                <div 
                  className="absolute top-0 bottom-0 bg-neutral-800 transition-all duration-300"
                  style={{
                    left: '50%',
                    right: evalScore >= 0 
                      ? `${Math.max(0, 50 - evalScore * 5)}%` 
                      : '50%'
                  }}
                />
                <div 
                  className="absolute top-0 bottom-0 bg-neutral-400 transition-all duration-300"
                  style={{
                    right: '50%',
                    left: evalScore < 0 
                      ? `${Math.max(0, 50 - Math.abs(evalScore) * 5)}%` 
                      : '50%'
                  }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-neutral-700">
                {evalScore > 0 ? `+${evalScore}` : evalScore === 0 ? '0.0' : evalScore}
              </span>
            </div>
          </div>

          {/* Scrollable Move History Log */}
          <div className="flex-1 min-h-0 flex flex-col pt-3.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-2">
              Move History ({Math.ceil(historyIndex / 2)})
            </span>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">
                  no moves played yet
                </div>
              ) : (
                Array.from({ length: Math.ceil(historyIndex / 2) }).map((_, i) => {
                  const whiteMove = history[i * 2]
                  const blackMove = history[i * 2 + 1]
                  
                  return (
                    <div 
                      key={`move_row_${i}`} 
                      className="grid grid-cols-12 gap-1 py-1 px-2 text-xs font-medium rounded-md hover:bg-neutral-50/50"
                    >
                      <span className="col-span-2 text-neutral-400 font-mono">
                        {i + 1}.
                      </span>
                      <span className="col-span-5 text-neutral-700 font-semibold flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-neutral-400/80" />
                        {whiteMove.san}
                      </span>
                      <span className="col-span-5 text-neutral-700 font-semibold flex items-center gap-1">
                        {blackMove && <ChevronRight className="w-3 h-3 text-neutral-400/80" />}
                        {blackMove ? blackMove.san : ''}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* FEN/PGN DATA EXPORT PANEL */}
        <div className="glass-panel rounded-chess p-5 space-y-3.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> FEN / PGN Coordinates
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyFen}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-chess bg-white/70 border border-neutral-200 hover:bg-white text-neutral-700 transition-all cursor-pointer"
            >
              {copiedText === 'fen' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText === 'fen' ? 'Copied FEN' : 'Copy FEN'}</span>
            </button>
            <button
              onClick={handleCopyPgn}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-chess bg-white/70 border border-neutral-200 hover:bg-white text-neutral-700 transition-all cursor-pointer"
            >
              {copiedText === 'pgn' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText === 'pgn' ? 'Copied PGN' : 'Copy PGN'}</span>
            </button>
          </div>

          <div className="pt-1.5 border-t border-neutral-200/40 flex gap-2">
            <input
              type="text"
              placeholder="Paste FEN to import..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="flex-1 py-1.5 px-3 bg-white/60 border border-neutral-200 rounded-chess text-xs text-neutral-700 focus:outline-none focus:border-neutral-900 transition-all"
            />
            <button
              onClick={handleImport}
              className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-semibold rounded-chess transition-colors cursor-pointer"
            >
              Import
            </button>
          </div>
        </div>

      </aside>

      {/* 4. FOOTER HUD STATUS ALERTS */}
      <footer className="absolute bottom-5 left-5 right-5 lg:right-[360px] z-30">
        <div className="w-full max-w-xl mx-auto py-2.5 px-6 glass-panel rounded-chess flex items-center justify-between text-xs font-semibold text-neutral-600">
          
          {/* Status Alert Labels */}
          <div className="flex items-center gap-4">
            {inCheck && !isGameOver && (
              <span className="text-rose-600 flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Check!</span>
              </span>
            )}
            {isGameOver && (
              <span className="text-neutral-900 font-extrabold flex items-center gap-1">
                <span>Game Over</span>
              </span>
            )}
            {/* ✅ FIX: Only show "Match in progress" when a game is actually started */}
            {!inCheck && !isGameOver && isGameStarted && (
              <span className="text-neutral-400">Match in progress</span>
            )}
            {!inCheck && !isGameOver && !isGameStarted && (
              <span className="text-neutral-400 italic">Ready — start a new game</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
            {/* Show last move coordinate details */}
            {history.length > 0 && (
              <span>
                Last Move: {history[history.length - 1].from} → {history[history.length - 1].to} ({history[history.length - 1].san})
              </span>
            )}
          </div>

          {/* Quick Draw Claim Action / Resign Action */}
          {!isGameOver && (gameMode === 'multiplayer' ? isGameStarted : historyIndex > 2) && (
            <button
              onClick={gameMode === 'multiplayer' ? resignMultiplayerGame : claimDraw}
              className="py-1 px-3 text-[10px] font-bold uppercase rounded-chess border border-neutral-200 bg-white/60 hover:bg-white text-neutral-600 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              {gameMode === 'multiplayer' ? 'Resign' : 'Offer Draw'}
            </button>
          )}

        </div>
      </footer>

    </div>
  )
}
