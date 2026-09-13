import { getSettings } from './settings';

export type SoundName = 'correct' | 'wrong' | 'gameover' | 'click' | 'start';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A single simple tone. Original synthesized audio — no external assets. */
function tone(freq: number, startAt: number, duration: number, type: OscillatorType, gain: number) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audio.currentTime + startAt;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const RECIPES: Record<SoundName, () => void> = {
  click: () => tone(320, 0, 0.07, 'triangle', 0.05),
  start: () => {
    tone(523.25, 0, 0.1, 'sine', 0.08);
    tone(783.99, 0.09, 0.14, 'sine', 0.08);
  },
  correct: () => {
    tone(659.25, 0, 0.09, 'sine', 0.08);
    tone(987.77, 0.08, 0.13, 'sine', 0.08);
  },
  wrong: () => {
    tone(196, 0, 0.16, 'sawtooth', 0.05);
    tone(155.56, 0.06, 0.2, 'sawtooth', 0.05);
  },
  gameover: () => {
    tone(523.25, 0, 0.12, 'sine', 0.07);
    tone(392, 0.12, 0.12, 'sine', 0.07);
    tone(261.63, 0.24, 0.26, 'sine', 0.08);
  },
};

export function playSound(name: SoundName): void {
  if (!getSettings().sound) return;
  try {
    RECIPES[name]();
  } catch {
    /* ignore audio failures */
  }
}
