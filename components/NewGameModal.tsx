import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import type { GameMode } from '../store/gameStore'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import type { AIDifficulty } from '../store/settingsStore'
import { Play, User, Cpu, Clock, Globe, Plus, Search } from 'lucide-react'

export function NewGameModal() {
  const isOpen = useUiStore((state) => state.isNewGameModalOpen)
  const setNewGameModalOpen = useUiStore((state) => state.setNewGameModalOpen)
  const startNewGame = useGameStore((state) => state.startNewGame)
  const createMultiplayerGame = useGameStore((state) => state.createMultiplayerGame)
  const joinMultiplayerGame = useGameStore((state) => state.joinMultiplayerGame)
  const isConnecting = useGameStore((state) => state.isConnectingMultiplayer)
  const difficulty = useSettingsStore((state) => state.aiDifficulty)
  const setDifficulty = useSettingsStore((state) => state.setDifficulty)

  const [mode, setMode] = useState<GameMode>('ai')
  const [colorChoice, setColorChoice] = useState<'white' | 'black' | 'random'>('white')
  const [timeChoice, setTimeChoice] = useState<number>(10) // 10 minutes rapid default
  const [multiplayerTab, setMultiplayerTab] = useState<'create' | 'join'>('create')
  const [joinCode, setJoinCode] = useState('')

  if (!isOpen) return null

  const handleStart = async () => {
    if (mode === 'multiplayer') {
      if (multiplayerTab === 'create') {
        const code = await createMultiplayerGame(colorChoice, timeChoice);
        if (code) {
          setNewGameModalOpen(false);
        }
      } else {
        if (!joinCode.trim()) return;
        const success = await joinMultiplayerGame(joinCode);
        if (success) {
          setNewGameModalOpen(false);
          setJoinCode('');
        } else {
          alert('Could not join match. Please verify the code and try again.');
        }
      }
    } else {
      startNewGame(mode, colorChoice, timeChoice)
      setNewGameModalOpen(false)
    }
  }

  const timeOptions = [
    { label: 'Untimed', value: 0 },
    { label: '1 min', value: 1 },
    { label: '3 min', value: 3 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '30 min', value: 30 },
  ]

  const difficultyOptions: { value: AIDifficulty; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
    { value: 'expert', label: 'Expert' },
    { value: 'master', label: 'Master' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden glass-modal rounded-chess transition-premium animate-in fade-in zoom-in-95 duration-200">
        
        {/* Title */}
        <div className="px-8 pt-8 pb-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
            Royal Chess 3D
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Configure your match settings below
          </p>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Game Mode Choice */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Game Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-chess border text-sm transition-all duration-200 ${
                  mode === 'ai'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white/50 text-neutral-700 border-neutral-200/80 hover:bg-white hover:border-neutral-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="font-medium">vs Computer</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('pvp')}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-chess border text-sm transition-all duration-200 ${
                  mode === 'pvp'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white/50 text-neutral-700 border-neutral-200/80 hover:bg-white hover:border-neutral-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">Local PvP</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('multiplayer')}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 rounded-chess border text-sm transition-all duration-200 ${
                  mode === 'multiplayer'
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white/50 text-neutral-700 border-neutral-200/80 hover:bg-white hover:border-neutral-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium">Multiplayer</span>
              </button>
            </div>
          </div>

          {/* AI Settings - Only show if vs AI is selected */}
          {mode === 'ai' && (
            <div className="space-y-4 animate-in slide-in-from-top-3 fade-in duration-200">
              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {difficultyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`py-2 px-3 text-sm rounded-chess border transition-all duration-150 ${
                        difficulty === opt.value
                          ? 'bg-neutral-800 text-white border-neutral-800'
                          : 'bg-white/50 text-neutral-600 border-neutral-200/60 hover:bg-white hover:border-neutral-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Your Color
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setColorChoice('white')}
                    className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                      colorChoice === 'white'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                    }`}
                  >
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorChoice('random')}
                    className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                      colorChoice === 'random'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorChoice('black')}
                    className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                      colorChoice === 'black'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                    }`}
                  >
                    Black
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Multiplayer Settings - Only show if Multiplayer is selected */}
          {mode === 'multiplayer' && (
            <div className="space-y-4 animate-in slide-in-from-top-3 fade-in duration-200">
              {/* Tabs: Create vs Join */}
              <div className="flex rounded-chess bg-neutral-200/50 p-1">
                <button
                  type="button"
                  onClick={() => setMultiplayerTab('create')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-chess transition-all ${
                    multiplayerTab === 'create'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Match
                </button>
                <button
                  type="button"
                  onClick={() => setMultiplayerTab('join')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-chess transition-all ${
                    multiplayerTab === 'join'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Join Match
                </button>
              </div>

              {multiplayerTab === 'create' ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Host Color Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Your Color
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setColorChoice('white')}
                        className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                          colorChoice === 'white'
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                        }`}
                      >
                        White
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorChoice('random')}
                        className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                          colorChoice === 'random'
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                        }`}
                      >
                        Random
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorChoice('black')}
                        className={`py-2.5 px-4 text-sm font-medium rounded-chess border transition-all duration-150 ${
                          colorChoice === 'black'
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white/80 text-neutral-700 border-neutral-200 hover:bg-white'
                        }`}
                      >
                        Black
                      </button>
                    </div>
                  </div>

                  {/* Time limit for hosted match */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Match Time Limit
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTimeChoice(opt.value)}
                          className={`py-2.5 px-3 text-sm rounded-chess border transition-all duration-150 ${
                            timeChoice === opt.value
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white/50 text-neutral-600 border-neutral-200/60 hover:bg-white hover:border-neutral-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-2 animate-in fade-in duration-150">
                  {/* Guest Join Code Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Enter Invite Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="E.G. ABC123"
                      disabled={isConnecting}
                      className="w-full text-center py-3.5 px-4 bg-white/50 border border-neutral-200/80 rounded-chess text-lg font-bold tracking-widest text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 uppercase disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Controls (Local / AI only, Multiplayer has its own inside create tab) */}
          {mode !== 'multiplayer' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Time Limit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {timeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeChoice(opt.value)}
                    className={`py-2.5 px-3 text-sm rounded-chess border transition-all duration-150 ${
                      timeChoice === opt.value
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white/50 text-neutral-600 border-neutral-200/60 hover:bg-white hover:border-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Start Game Footer Action */}
        <div className="px-8 pb-8 pt-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={isConnecting || (mode === 'multiplayer' && multiplayerTab === 'join' && !joinCode.trim())}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-chess bg-neutral-900 text-white font-medium hover:bg-neutral-850 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {isConnecting
                ? 'Connecting...'
                : mode === 'multiplayer'
                ? multiplayerTab === 'create'
                  ? 'Create Room'
                  : 'Join Room'
                : 'Start Match'}
            </span>
          </button>
        </div>

      </div>
    </div>
  )
}
