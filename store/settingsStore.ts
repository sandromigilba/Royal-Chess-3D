import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AIDifficulty = 'beginner' | 'easy' | 'normal' | 'hard' | 'expert' | 'master';
export type BackgroundTheme = 'default' | 'dark-white' | 'cloudy-sky';
export type PieceTheme = 'doff' | 'transparent';

export interface SettingsState {
  aiDifficulty: AIDifficulty;
  soundVolume: number; // 0 to 1
  cameraSensitivity: number; // 0.5 to 2.0
  animationSpeed: number; // 0.5 to 2.0
  boardRotationLocked: boolean;
  stalemateRuleEnabled: boolean;
  backgroundTheme: BackgroundTheme;
  pieceTheme: PieceTheme;
  language: string;
  setDifficulty: (difficulty: AIDifficulty) => void;
  setSoundVolume: (volume: number) => void;
  setCameraSensitivity: (sensitivity: number) => void;
  setAnimationSpeed: (speed: number) => void;
  setBoardRotationLocked: (locked: boolean) => void;
  setStalemateRuleEnabled: (enabled: boolean) => void;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
  setPieceTheme: (theme: PieceTheme) => void;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiDifficulty: 'normal',
      soundVolume: 0.5,
      cameraSensitivity: 1.0,
      animationSpeed: 1.0,
      boardRotationLocked: false,
      stalemateRuleEnabled: false,
      backgroundTheme: 'default',
      pieceTheme: 'doff',
      language: 'en',

      setDifficulty: (aiDifficulty) => set({ aiDifficulty }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setCameraSensitivity: (cameraSensitivity) => set({ cameraSensitivity }),
      setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
      setBoardRotationLocked: (boardRotationLocked) => set({ boardRotationLocked }),
      setStalemateRuleEnabled: (stalemateRuleEnabled) => set({ stalemateRuleEnabled }),
      setBackgroundTheme: (backgroundTheme) => set({ backgroundTheme }),
      setPieceTheme: (pieceTheme) => set({ pieceTheme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'chess_3d_settings',
      // Only persist the data fields, not the setter functions
      partialize: (state) => ({
        aiDifficulty: state.aiDifficulty,
        soundVolume: state.soundVolume,
        cameraSensitivity: state.cameraSensitivity,
        animationSpeed: state.animationSpeed,
        boardRotationLocked: state.boardRotationLocked,
        stalemateRuleEnabled: state.stalemateRuleEnabled,
        backgroundTheme: state.backgroundTheme,
        pieceTheme: state.pieceTheme,
        language: state.language,
      }),
    }
  )
);
