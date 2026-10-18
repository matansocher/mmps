import { hapticSuccess } from './telegram';

const STORAGE_KEY = 'coach:goal-sound';

let context: AudioContext | null = null;

export function isGoalSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setGoalSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore unavailable storage
  }
}

// Browsers only let audio start after a user gesture, so the context is created (or resumed) on the first one.
export function installAudioUnlock(): () => void {
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const unlock = () => {
    if (typeof AudioContext === 'undefined') return;
    context ??= new AudioContext();
    void context.resume().then(() => {
      if (context?.state === 'running') events.forEach((name) => window.removeEventListener(name, unlock, true));
    });
  };
  events.forEach((name) => window.addEventListener(name, unlock, true));
  return () => events.forEach((name) => window.removeEventListener(name, unlock, true));
}

// Two warm pickup notes resolve into a short C-major chord.
function playChime(ctx: AudioContext): void {
  const start = ctx.currentTime + 0.02;
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  master.gain.value = 0.16;
  filter.type = 'lowpass';
  filter.frequency.value = 2200;
  filter.Q.value = 0.5;
  master.connect(filter).connect(ctx.destination);
  const notes = [
    { frequency: 523.25, offset: 0, duration: 0.16, volume: 0.7 },
    { frequency: 659.25, offset: 0.12, duration: 0.16, volume: 0.75 },
    { frequency: 783.99, offset: 0.24, duration: 0.48, volume: 0.8 },
    { frequency: 523.25, offset: 0.24, duration: 0.48, volume: 0.45 },
    { frequency: 659.25, offset: 0.24, duration: 0.48, volume: 0.35 },
  ];
  let remaining = notes.length;
  notes.forEach(({ frequency, offset, duration, volume }) => {
    const at = start + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(volume * 0.45, at + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(master);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      if (--remaining === 0) {
        master.disconnect();
        filter.disconnect();
      }
    };
    osc.start(at);
    osc.stop(at + duration + 0.01);
  });
}

export function celebrateGoal(): void {
  if (!isGoalSoundEnabled()) return;
  hapticSuccess();
  if (context?.state === 'running') playChime(context);
}

export async function previewGoalSound(): Promise<void> {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  await context.resume();
  playChime(context);
}
