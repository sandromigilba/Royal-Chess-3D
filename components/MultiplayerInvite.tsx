import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { Copy, Check, LogOut, Loader2 } from 'lucide-react'

export function MultiplayerInvite() {
  const gameMode = useGameStore((state) => state.gameMode)
  const inviteCode = useGameStore((state) => state.inviteCode)
  const isStarted = useGameStore((state) => state.isMultiplayerGameStarted)
  const leaveGame = useGameStore((state) => state.leaveMultiplayerGame)

  const [copied, setCopied] = useState(false)

  // Only display if we are in multiplayer mode, have an invite code, and the guest hasn't connected yet
  if (gameMode !== 'multiplayer' || !inviteCode || isStarted) {
    return null
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden glass-modal rounded-chess p-8 text-center transition-premium animate-in fade-in zoom-in-95 duration-200">
        
        {/* Loading Spinner Header */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900/5">
            <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold tracking-tight text-neutral-900">
          Match Created!
        </h3>
        <p className="mt-2 text-sm text-neutral-500 max-w-xs mx-auto">
          Share this invite code with your friend. The game will start automatically when they join.
        </p>

        {/* Invite Code Box */}
        <div className="my-6 p-4 bg-white/60 border border-neutral-200/80 rounded-chess flex flex-col items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Invite Code
          </span>
          <span className="text-4xl font-extrabold tracking-widest text-neutral-900 font-mono">
            {inviteCode}
          </span>
          
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`mt-2 flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer active:scale-95 ${
              copied
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Status text */}
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-900"></span>
          </span>
          <span className="font-medium animate-pulse">Waiting for opponent to connect...</span>
        </div>

        {/* Leave Match / Close button */}
        <button
          type="button"
          onClick={leaveGame}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-chess bg-white text-neutral-700 border border-neutral-250 font-medium hover:bg-neutral-50 shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 text-neutral-500" />
          <span>Cancel & Leave Room</span>
        </button>

      </div>
    </div>
  )
}
