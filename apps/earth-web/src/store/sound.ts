import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../lib/storage';

const KEY = 'sound';
const listeners = new Set<() => void>();
let enabled = readJson(KEY, true, (value): value is boolean => typeof value === 'boolean');
let context: AudioContext | null = null;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSoundEnabled(): readonly [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, () => enabled);
  return [value, toggleSound] as const;
}

export function toggleSound(): void {
  enabled = !enabled;
  writeJson(KEY, enabled);
  listeners.forEach((listener) => listener());
}

function audio(): AudioContext | null {
  if (!enabled || typeof AudioContext === 'undefined') return null;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, at: number, from: number, to: number, seconds: number, gain: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
  const level = ctx.createGain();
  level.gain.setValueAtTime(gain, at);
  level.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(level).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds);
}

export function playCorrect(): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 660, 660, 0.14, 0.16);
  tone(ctx, ctx.currentTime + 0.09, 990, 990, 0.22, 0.16);
}

export function playMiss(): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 220, 180, 0.22, 0.12, 'square');
}

// A short rising arpeggio for a finished round.
export function playComplete(): void {
  const ctx = audio();
  if (!ctx) return;
  [523, 659, 784].forEach((frequency, i) => tone(ctx, ctx.currentTime + i * 0.12, frequency, frequency, 0.5, 0.14));
}
