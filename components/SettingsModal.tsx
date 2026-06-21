import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import type { AIDifficulty, BackgroundTheme, PieceTheme } from '../store/settingsStore'
import { X, Volume2, Volume1, VolumeX, Shield, Settings2, Sliders, Globe, Eye, Scale, Palette, Crown } from 'lucide-react'

export function SettingsModal() {
  const isOpen = useUiStore((state) => state.isSettingsModalOpen)
  const setSettingsModalOpen = useUiStore((state) => state.setSettingsModalOpen)

  const {
    aiDifficulty,
    soundVolume,
    cameraSensitivity,
    boardRotationLocked,
    stalemateRuleEnabled,
    backgroundTheme,
    pieceTheme,
    language,
    setDifficulty,
    setSoundVolume,
    setCameraSensitivity,
    setBoardRotationLocked,
    setStalemateRuleEnabled,
    setBackgroundTheme,
    setPieceTheme,
    setLanguage
  } = useSettingsStore()

  if (!isOpen) return null

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ]

  const difficulties: { value: AIDifficulty; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
    { value: 'expert', label: 'Expert' },
    { value: 'master', label: 'Master' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/15 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden glass-modal rounded-chess transition-premium animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200/50">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-neutral-700" />
            <h3 className="text-lg font-bold text-neutral-800">Game Settings</h3>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-neutral-200/50 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {/* AI Level */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> AI Difficulty
            </label>
            <select
              value={aiDifficulty}
              onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
              className="w-full py-2.5 px-4 bg-white/70 border border-neutral-200 rounded-chess text-neutral-700 focus:border-neutral-900 focus:outline-none transition-all duration-200"
            >
              {difficulties.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Volume */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                {soundVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-neutral-450" />
                ) : soundVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5 text-neutral-600" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-neutral-800" />
                )} Sound Effects Volume
              </label>
              <span className="text-xs font-mono font-medium text-neutral-600">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-neutral-950"
              style={{
                background: `linear-gradient(to right, #0a0a0a 0%, #0a0a0a ${soundVolume * 100}%, #d4d4d4 ${soundVolume * 100}%, #d4d4d4 100%)`
              }}
            />
          </div>

          {/* Camera Sensitivity */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Camera Rotation Sensitivity
              </label>
              <span className="text-xs font-mono font-medium text-neutral-600">
                {cameraSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={cameraSensitivity}
              onChange={(e) => setCameraSensitivity(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-neutral-950"
              style={{
                background: `linear-gradient(to right, #0a0a0a 0%, #0a0a0a ${((cameraSensitivity - 0.5) / 1.5) * 100}%, #d4d4d4 ${((cameraSensitivity - 0.5) / 1.5) * 100}%, #d4d4d4 100%)`
              }}
            />
          </div>

          {/* Board Rotation Lock */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Lock Camera Turn
            </label>
            <button
              onClick={() => setBoardRotationLocked(!boardRotationLocked)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-250 cursor-pointer ${
                boardRotationLocked ? 'bg-neutral-800' : 'bg-neutral-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-250 ${
                  boardRotationLocked ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Stalemate Rule */}
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Stalemate Rule (Draw)
            </label>
            <button
              onClick={() => setStalemateRuleEnabled(!stalemateRuleEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-250 cursor-pointer ${
                stalemateRuleEnabled ? 'bg-neutral-800' : 'bg-neutral-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-250 ${
                  stalemateRuleEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Piece Theme */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Chess Piece Style
            </label>
            <select
              value={pieceTheme}
              onChange={(e) => setPieceTheme(e.target.value as PieceTheme)}
              className="w-full py-2.5 px-4 bg-white/70 border border-neutral-200 rounded-chess text-neutral-700 focus:border-neutral-900 focus:outline-none transition-all duration-200"
            >
              <option value="doff">Doff (Matte)</option>
              <option value="transparent">Glossy (Mengkilat)</option>
            </select>
          </div>

          {/* Background Theme */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Background Theme
            </label>
            <select
              value={backgroundTheme}
              onChange={(e) => setBackgroundTheme(e.target.value as BackgroundTheme)}
              className="w-full py-2.5 px-4 bg-white/70 border border-neutral-200 rounded-chess text-neutral-700 focus:border-neutral-900 focus:outline-none transition-all duration-200"
            >
              <option value="default">Classic Light</option>
              <option value="dark-white">Off-White (Putih Gelap)</option>
              <option value="cloudy-sky">Cloudy Sky (Langit Berawan)</option>
            </select>
          </div>

          {/* Language dropdown */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full py-2.5 px-4 bg-white/70 border border-neutral-200 rounded-chess text-neutral-700 focus:border-neutral-900 focus:outline-none transition-all duration-200"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-100/50 border-t border-neutral-200/50 flex justify-end">
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="py-2 px-5 bg-neutral-800 hover:bg-neutral-900 text-white text-sm font-medium rounded-chess transition-colors cursor-pointer"
          >
            Apply Changes
          </button>
        </div>

      </div>
    </div>
  )
}
