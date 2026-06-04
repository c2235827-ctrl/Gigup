/**
 * High-fidelity synthetic mobile feedback sound effects
 * Uses native Web Audio API to play fully offline-capable, latency-free chirps & alerts
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  
  return audioCtx;
}

/**
 * Play a high-quality electronic "successful arpeggio pop" tone sequence
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Tone 1: Base high sound (C5 rising to E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5

    // Smooth ADSR decay envelope
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02); // Peek soft 12%
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Tone 2: Harmonious high accent note (G5 rising to C6), starting slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.06); // G5 Ready
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18); // C6 Perfect 5th

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now + 0.06);
    gain2.gain.linearRampToValueAtTime(0.10, now + 0.08); // Peek soft 10%
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    // Warm, micro trigger
    osc1.start(now);
    osc1.stop(now + 0.16);

    osc2.start(now + 0.06);
    osc2.stop(now + 0.26);
  } catch (error) {
    console.warn('[Audio] Could not synthesize success sound feedback:', error);
  }
}

/**
 * Play a soft descending triangle warning tone
 */
export function playFailureSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: Low-mid warning (A3 sliding down to F3)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle'; // Warm woodsy tone, less harsh than square wave
    osc1.frequency.setValueAtTime(220.00, now); // A3
    osc1.frequency.linearRampToValueAtTime(174.61, now + 0.10); // F3

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Tone 2: Solid lower warning base (D3 sliding down to A2)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(146.83, now + 0.10); // D3
    osc2.frequency.linearRampToValueAtTime(110.00, now + 0.26); // A2 Base

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now + 0.10);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.20);

    osc2.start(now + 0.10);
    osc2.stop(now + 0.35);
  } catch (error) {
    console.warn('[Audio] Could not synthesize failure sound feedback:', error);
  }
}



