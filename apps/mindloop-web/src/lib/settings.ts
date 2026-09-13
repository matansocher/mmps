const SETTINGS_KEY = 'mindloop:settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  themeMode: ThemeMode;
  sound: boolean;
  reducedMotion: boolean;
}

const DEFAULTS: Settings = {
  themeMode: 'system',
  sound: true,
  reducedMotion: false,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...(typeof parsed === 'object' && parsed ? parsed : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
  return next;
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}
