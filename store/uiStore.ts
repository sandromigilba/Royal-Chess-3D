import { create } from 'zustand'

export interface UiState {
  selectedSquare: string | null;
  hoveredSquare: string | null;
  legalMoves: string[];
  // Modal visibility states
  isNewGameModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isGameOverModalOpen: boolean;
  isPromotionModalOpen: boolean;
  promotionPendingMove: { from: string; to: string } | null;
  // Viewport and camera
  isFullscreen: boolean;
  cameraAngle: number;
  // Follow-cam mode: camera tracks behind the last moved piece
  followCam: boolean;
  // Actions
  setSelectedSquare: (sq: string | null) => void;
  setHoveredSquare: (sq: string | null) => void;
  setLegalMoves: (moves: string[]) => void;
  setNewGameModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setGameOverModalOpen: (open: boolean) => void;
  setPromotionModalOpen: (open: boolean) => void;
  setPromotionPendingMove: (move: { from: string; to: string } | null) => void;
  setIsFullscreen: (fs: boolean) => void;
  setCameraAngle: (angle: number) => void;
  rotateCamera180: () => void;
  resetCamera: () => void;
  toggleFollowCam: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedSquare: null,
  hoveredSquare: null,
  legalMoves: [],
  isNewGameModalOpen: false,
  isSettingsModalOpen: false,
  isGameOverModalOpen: false,
  isPromotionModalOpen: false,
  promotionPendingMove: null,
  isFullscreen: false,
  cameraAngle: 0,
  followCam: false,

  setSelectedSquare: (selectedSquare) => set({ selectedSquare }),
  setHoveredSquare: (hoveredSquare) => set({ hoveredSquare }),
  setLegalMoves: (legalMoves) => set({ legalMoves }),
  setNewGameModalOpen: (isNewGameModalOpen) => set({ isNewGameModalOpen }),
  setSettingsModalOpen: (isSettingsModalOpen) => set({ isSettingsModalOpen }),
  setGameOverModalOpen: (isGameOverModalOpen) => set({ isGameOverModalOpen }),
  setPromotionModalOpen: (isPromotionModalOpen) => set({ isPromotionModalOpen }),
  setPromotionPendingMove: (promotionPendingMove) => set({ promotionPendingMove }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setCameraAngle: (cameraAngle) => set({ cameraAngle }),
  rotateCamera180: () => set((state) => ({ cameraAngle: state.cameraAngle + Math.PI })),
  resetCamera: () => set({ cameraAngle: 0 }),
  toggleFollowCam: () => set((state) => ({ followCam: !state.followCam })),
}));
