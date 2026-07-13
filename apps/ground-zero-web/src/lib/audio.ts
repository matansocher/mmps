export type SoundCue = 'objective' | 'caught' | 'completed';

const CUES: Readonly<Record<SoundCue, { readonly frequency: number; readonly duration: number; readonly gain: number }>> = {
  objective: { frequency: 660, duration: 0.09, gain: 0.035 },
  caught: { frequency: 150, duration: 0.18, gain: 0.055 },
  completed: { frequency: 880, duration: 0.16, gain: 0.04 },
};

export function playSound(cue: SoundCue, enabled: boolean): void {
  if (!enabled) return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const config = CUES[cue];

  oscillator.type = cue === 'caught' ? 'sawtooth' : 'sine';
  oscillator.frequency.value = config.frequency;
  gain.gain.setValueAtTime(config.gain, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + config.duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + config.duration);
  oscillator.addEventListener('ended', () => void context.close(), { once: true });
}
