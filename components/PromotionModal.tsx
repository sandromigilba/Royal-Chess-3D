import { useUiStore } from '../store/uiStore'
import { useGameStore } from '../store/gameStore'
import { Crown, Castle, Shield, Award } from 'lucide-react'

export function PromotionModal() {
  const isOpen = useUiStore((state) => state.isPromotionModalOpen)
  const setPromotionModalOpen = useUiStore((state) => state.setPromotionModalOpen)
  const pendingMove = useUiStore((state) => state.promotionPendingMove)
  const setPromotionPendingMove = useUiStore((state) => state.setPromotionPendingMove)
  
  const makeMove = useGameStore((state) => state.makeMove)
  const setSelectedSquare = useUiStore((state) => state.setSelectedSquare)
  const setLegalMoves = useUiStore((state) => state.setLegalMoves)

  if (!isOpen || !pendingMove) return null

  const handlePromote = (pieceType: 'q' | 'r' | 'b' | 'n') => {
    makeMove(pendingMove.from, pendingMove.to, pieceType)
    
    // Reset selection states
    setPromotionModalOpen(false)
    setPromotionPendingMove(null)
    setSelectedSquare(null)
    setLegalMoves([])
  }

  const options: { type: 'q' | 'r' | 'b' | 'n'; label: string; icon: typeof Crown; desc: string }[] = [
    { type: 'q', label: 'Queen', icon: Crown, desc: '9 points' },
    { type: 'r', label: 'Rook', icon: Castle, desc: '5 points' },
    { type: 'b', label: 'Bishop', icon: Award, desc: '3 points' },
    { type: 'n', label: 'Knight', icon: Shield, desc: '3 points' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden glass-modal rounded-chess transition-premium animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h3 className="text-lg font-bold text-neutral-800">Pawn Promotion</h3>
          <p className="text-sm text-neutral-500 mt-0.5">Select a promotion piece</p>
        </div>

        {/* List Grid Options */}
        <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => handlePromote(opt.type)}
                className="flex flex-col items-center justify-center p-4 bg-white/70 hover:bg-white border border-neutral-200/80 hover:border-neutral-400 rounded-chess text-neutral-700 hover:text-neutral-900 shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                <div className="p-2.5 bg-neutral-100 rounded-full mb-2.5">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="text-xs text-neutral-400 font-mono mt-0.5">{opt.desc}</span>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
