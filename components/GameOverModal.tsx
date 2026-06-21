import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'
import { useGameStore } from '../store/gameStore'
import { Trophy, RefreshCw, X, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

export function GameOverModal() {
  const isOpen = useUiStore((state) => state.isGameOverModalOpen)
  const setGameOverModalOpen = useUiStore((state) => state.setGameOverModalOpen)
  
  const isGameOver = useGameStore((state) => state.isGameOver)
  const gameOverReason = useGameStore((state) => state.gameOverReason)
  const winner = useGameStore((state) => state.winner)
  const restartGame = useGameStore((state) => state.restartGame)
  const gameMode = useGameStore((state) => state.gameMode)
  const playerColor = useGameStore((state) => state.playerColor)

  // Trigger celebration confetti when game is won
  useEffect(() => {
    if (isGameOver && isOpen) {
      const playerWonPvp = gameMode === 'pvp' && winner !== 'draw'
      const playerWonAi = gameMode === 'ai' && winner === playerColor
      
      if (playerWonPvp || playerWonAi) {
        // Double burst for victory feeling
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        })
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          })
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          })
        }, 250)
      }
    }
  }, [isGameOver, isOpen, winner, gameMode, playerColor])

  // Synchronize store isGameOver state with UI modal
  useEffect(() => {
    if (isGameOver) {
      setGameOverModalOpen(true)
    } else {
      setGameOverModalOpen(false)
    }
  }, [isGameOver, setGameOverModalOpen])

  if (!isOpen) return null

  const handleRestart = () => {
    restartGame()
    setGameOverModalOpen(false)
  }

  const getWinnerText = () => {
    if (winner === 'draw') return 'Match Drawn'
    if (gameMode === 'ai') {
      return winner === playerColor ? 'Victory!' : 'AI Victory'
    }
    return winner === 'white' ? 'White Wins!' : 'Black Wins!'
  }

  const getReasonText = () => {
    switch (gameOverReason) {
      case 'checkmate':
        return 'by checkmate'
      case 'stalemate':
        return winner === 'draw'
          ? 'by stalemate (no legal moves)'
          : 'by stalemate (opponent has no legal moves)'
      case 'insufficient':
        return 'due to insufficient mating material'
      case 'threefold':
        return 'by threefold repetition'
      case 'fifty_moves':
        return 'by fifty-move rule'
      case 'timeout':
        return 'on time (timer expired)'
      case 'draw_offer':
        return 'by mutual agreement'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden glass-modal rounded-chess transition-premium animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top close */}
        <div className="flex justify-end p-4 absolute right-0 top-0">
          <button
            onClick={() => setGameOverModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-neutral-200/50 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-8 text-center flex flex-col items-center">
          
          {/* Trophy icon for win, badge for draw */}
          <div className={`p-4 rounded-full mb-5 ${
            winner === 'draw' 
              ? 'bg-neutral-100 text-neutral-600' 
              : (gameMode === 'ai' && winner !== playerColor ? 'bg-neutral-100 text-neutral-500' : 'bg-amber-100 text-amber-600')
          }`}>
            {winner === 'draw' ? (
              <Award className="w-10 h-10" />
            ) : (
              <Trophy className="w-10 h-10" />
            )}
          </div>

          <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
            {getWinnerText()}
          </h2>
          
          <p className="text-sm font-medium text-neutral-500 mt-1.5 lowercase">
            {getReasonText()}
          </p>

          {/* Action buttons */}
          <div className="mt-8 w-full space-y-3">
            <button
              onClick={handleRestart}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-chess bg-neutral-900 text-white font-medium hover:bg-neutral-850 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Rematch</span>
            </button>
            
            <button
              onClick={() => setGameOverModalOpen(false)}
              className="w-full py-3 px-6 rounded-chess border border-neutral-200 bg-white/60 hover:bg-white text-neutral-700 text-sm font-medium transition-colors cursor-pointer"
            >
              Review Board
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
