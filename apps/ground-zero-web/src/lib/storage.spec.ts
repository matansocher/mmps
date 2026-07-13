import { beforeEach, describe, expect, it } from 'vitest';
import { loadProfile, recordFloorCompletion, setSoundEnabled } from './storage';

const values = new Map<string, string>();

const storage: Storage = {
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => void values.delete(key),
  setItem: (key, value) => void values.set(key, value),
};

Object.defineProperty(globalThis, 'localStorage', { value: storage });

describe('game profile storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when saved data is invalid', () => {
    localStorage.setItem('ground-zero.profile.v1', '{broken');

    expect(loadProfile()).toEqual({
      unlockedFloor: 1,
      bestTimes: {},
      settings: { soundEnabled: true },
    });
  });

  it('unlocks the next floor and retains the fastest time', () => {
    recordFloorCompletion('floor-01', 1, 5000);
    const profile = recordFloorCompletion('floor-01', 1, 7000);

    expect(profile.unlockedFloor).toEqual(2);
    expect(profile.bestTimes['floor-01']).toEqual(5000);
  });

  it('persists the sound preference', () => {
    expect(setSoundEnabled(false).settings.soundEnabled).toEqual(false);
    expect(loadProfile().settings.soundEnabled).toEqual(false);
  });
});
