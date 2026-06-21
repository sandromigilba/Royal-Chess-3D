import { setAiPlayer } from '../store/gameStore'

let worker: Worker | null = null;
let activeResolve: ((value: { from: string; to: string; promotion?: string }) => void) | null = null;

export function initAiManager() {
  if (typeof window === 'undefined') return;

  try {
    // Instantiate background Worker using Vite module worker syntax
    worker = new Worker(
      new URL('./ai.worker.ts', import.meta.url), 
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      if (activeResolve) {
        activeResolve(e.data);
        activeResolve = null;
      }
    };
  } catch (err) {
    console.error("Failed to initialize Chess AI Web Worker, falling back to main-thread search:", err);
  }

  // Set the AI player function hook in gameStore
  setAiPlayer(requestAiMove);
}

export function requestAiMove(
  fen: string, 
  difficulty: string
): Promise<{ from: string; to: string; promotion?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ from: '', to: '' });
      return;
    }

    if (!worker) {
      initAiManager();
    }

    // Abort active calculation if any to prevent race conditions
    if (activeResolve) {
      activeResolve({ from: '', to: '' });
    }

    activeResolve = resolve;

    if (worker) {
      worker.postMessage({ fen, difficulty });
    } else {
      // Inline search fallback if worker load failed
      import('./ai.worker')
        .then((module) => {
          const move = module.calculateBestMove(fen, difficulty);
          resolve(move);
        })
        .catch((err) => {
          console.error("Main-thread search fallback failed:", err);
          resolve({ from: '', to: '' });
        });
    }
  });
}
