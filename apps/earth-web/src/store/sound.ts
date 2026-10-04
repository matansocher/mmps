import { useSyncExternalStore } from 'react';
import { readJson, writeJson } from '../lib/storage';

const KEY = 'sound';
const listeners = new Set<() => void>();
let enabled = readJson(KEY, true, (value): value is boolean => typeof value === 'boolean');
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

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

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.05), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  return noise;
}

function click(ctx: AudioContext, at: number, gain: number, frequency: number): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.4;
  const level = ctx.createGain();
  level.gain.value = gain;
  source.connect(filter).connect(level).connect(ctx.destination);
  source.start(at);
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

// The clatter of a split-flap board settling.
export function playFlaps(count: number): void {
  const ctx = audio();
  if (!ctx) return;
  const flaps = Math.min(count, 28);
  for (let i = 0; i < flaps; i++) click(ctx, ctx.currentTime + i * 0.028 + Math.random() * 0.01, 0.16 * (1 - i / (flaps * 1.4)), 2400 + Math.random() * 1200);
}

export function playStamp(): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 150, 45, 0.18, 0.5);
  click(ctx, ctx.currentTime, 0.5, 900);
}

export function playMiss(): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 220, 180, 0.22, 0.12, 'square');
}

// The two-note airport chime.
export function playChime(): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, ctx.currentTime, 784, 784, 0.9, 0.18);
  tone(ctx, ctx.currentTime + 0.32, 587, 587, 1.1, 0.18);
}
