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

// A soft rising three-note chime (C6 → E6 → G6) with a bell-like decay.
function playChime(ctx: AudioContext): void {
  const start = ctx.currentTime + 0.02;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  [1046.5, 1318.5, 1568].forEach((frequency, i) => {
    const at = start + i * 0.11;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    overtone.type = 'triangle';
    osc.frequency.value = frequency;
    overtone.frequency.value = frequency * 2;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(1, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.12;
    osc.connect(gain);
    overtone.connect(overtoneGain).connect(gain);
    gain.connect(master);
    [osc, overtone].forEach((node) => {
      node.start(at);
      node.stop(at + 0.65);
    });
  });
}

export function celebrateGoal(): void {
  if (!isGoalSoundEnabled()) return;
  hapticSuccess();
  if (context?.state === 'running') playChime(context);
}
