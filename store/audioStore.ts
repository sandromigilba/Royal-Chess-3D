import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AudioState {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    {
      name: 'chess_3d_audio',
      partialize: (state) => ({ soundEnabled: state.soundEnabled }),
    }
  )
);
