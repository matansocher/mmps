import { emptyProfile } from '../../../../src/features/hells-kitchen/game/content';
import { parseSave } from '../../../../src/features/hells-kitchen/game/schema';
import type { Profile, Save } from '../../../../src/features/hells-kitchen/game/types';

const KEY = 'hells-kitchen:save:v1';
export type LocalSave = { readonly save: Save; readonly pending: boolean };
export function readLocal(): LocalSave | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('save' in value) || !('pending' in value)) throw new Error('The local save needs recovery. It has been preserved.');
  const save = parseSave(value.save);
  if (!save || typeof value.pending !== 'boolean') throw new Error('The local save needs recovery. It has been preserved.');
  return { save, pending: value.pending };
}
export function writeLocal(save: Save, pending: boolean): void {
  localStorage.setItem(KEY, JSON.stringify({ save, pending }));
}
export function initialSave(): Save {
  return { revision: 0, profile: emptyProfile(), updatedAt: null };
}
export function withProfile(save: Save, profile: Profile): Save {
  return { ...save, profile };
}
export function exportLocal(): string {
  return localStorage.getItem(KEY) ?? '';
}

export type Settings = { readonly music: number; readonly effects: number; readonly voice: number };
export function readSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem('hells-kitchen:settings') ?? '{}');
    const volume = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback);
    return { music: volume(value.music, 0.25), effects: volume(value.effects, 0.6), voice: volume(value.voice, 0.7) };
  } catch {
    return { music: 0.25, effects: 0.6, voice: 0.7 };
  }
}
export function writeSettings(settings: Settings): void {
  localStorage.setItem('hells-kitchen:settings', JSON.stringify(settings));
}
