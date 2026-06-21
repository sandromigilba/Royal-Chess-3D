// Web Audio API Sound Synthesizer for Chess Sound Effects
// Programmatic synthesis ensures 100% reliable sound effects with zero assets to load.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

// Play a short wood/plastic tapping click
function playMove() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  // Pitch bend down from 300Hz to 100Hz
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

  gainNode.gain.setValueAtTime(0.15, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

// Play a sharp plastic/wood impact capture sound
function playCapture() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create impact sound using low frequency triangle wave and a short white noise burst
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

  gainNode.gain.setValueAtTime(0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);

  // Add a quick noise snap for the capture impact
  try {
    const bufferSize = ctx.sampleRate * 0.04; // 40ms noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.04);
  } catch {
    // Fallback if buffer creation fails
  }
}

// Play a high dual-tone alert chime
function playCheck() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Tone 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now); // D5
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.25);

  // Tone 2 (delayed slightly)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(783.99, now + 0.07); // G5
  gain2.gain.setValueAtTime(0.1, now + 0.07);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.07);
  osc2.stop(now + 0.32);
}

// Play a deep minor-seventh resolving defeat chord
function playCheckmate() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [130.81, 155.56, 196.00, 233.08]; // C3, Eb3, G3, Bb3 (C minor 7th)

  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    
    // Add lowpass filter to make it sound warm and brassy, not harsh
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    // Stagger starts slightly
    const startOffset = index * 0.03;
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + startOffset + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + startOffset);
    osc.stop(now + 1.2);
  });
}

// Play an ascending major-chord arpeggio celebration
function playVictory() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + index * 0.08);

    gainNode.gain.setValueAtTime(0, now + index * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.08, now + index * 0.08 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.4);
  });
}

// Play a neutral resolving tone
function playDraw() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const frequencies = [220.00, 277.18, 329.63]; // A3, C#4, E4 (A Major)

  frequencies.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(0.07, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  });
}

// Play a sparkly chime
function playPromotion() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Sweep frequency upwards quickly
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

  // Add a fast frequency modulation (vibrato) for sparkle
  const fm = ctx.createOscillator();
  const fmGain = ctx.createGain();
  fm.frequency.value = 30; // 30Hz modulation
  fmGain.gain.value = 20;  // frequency range

  fm.connect(fmGain);
  fmGain.connect(osc.frequency);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  fm.start(now);
  osc.start(now);
  
  fm.stop(now + 0.35);
  osc.stop(now + 0.35);
}

// Exported trigger function mapping to all sound types
export function playSound(type: 'move' | 'capture' | 'check' | 'checkmate' | 'victory' | 'draw' | 'promotion') {
  try {
    switch (type) {
      case 'move':
        playMove();
        break;
      case 'capture':
        playCapture();
        break;
      case 'check':
        playCheck();
        break;
      case 'checkmate':
        playCheckmate();
        break;
      case 'victory':
        playVictory();
        break;
      case 'draw':
        playDraw();
        break;
      case 'promotion':
        playPromotion();
        break;
    }
  } catch (error) {
    console.warn("Failed to play sound:", error);
  }
}
