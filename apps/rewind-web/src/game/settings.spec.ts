import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS, readSettings, saveSettings, SETTINGS_KEY } from './settings';

describe('real settings', () => {
  test('defaults to quiet, allows motion reduction, and persists both choices', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    saveSettings(storage, { sound: true, reducedMotion: true });
    expect(readSettings(storage)).toEqual({ sound: true, reducedMotion: true });
    expect(data.has(SETTINGS_KEY)).toEqual(true);
  });
  test.each(['null', '{}', '{"sound":"yes","reducedMotion":false}', '{'])('rejects invalid saved settings: %s', (value) => {
    expect(() => readSettings({ getItem: () => value })).toThrow();
  });
  test('reports storage failures', () => {
    expect(() =>
      saveSettings(
        {
          setItem: () => {
            throw new Error('full');
          },
        },
        DEFAULT_SETTINGS,
      ),
    ).toThrow('full');
  });
});
