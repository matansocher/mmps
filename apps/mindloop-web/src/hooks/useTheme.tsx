import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, saveSettings } from '../lib/settings';
import type { ThemeMode } from '../lib/settings';

type Theme = 'light' | 'dark';

/** Legacy key kept so a previously-chosen theme still migrates in. */
const LEGACY_KEY = 'mindloop:theme';

interface ThemeContextValue {
  /** Resolved theme actually applied to the DOM. */
  theme: Theme;
  /** User preference: light, dark, or follow system. */
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  /** Toggles between an explicit light and dark preference. */
  toggle: () => void;
  setTheme: (t: Theme) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function initialSettings() {
  const s = getSettings();
  // One-time migration from the old standalone theme key.
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      localStorage.removeItem(LEGACY_KEY);
      return saveSettings({ themeMode: legacy });
    }
  } catch {
    /* ignore */
  }
  return s;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ themeMode, sound, reducedMotion }, setState] = useState(() => {
    const s = initialSettings();
    return { themeMode: s.themeMode, sound: s.sound, reducedMotion: s.reducedMotion };
  });

  const [resolved, setResolved] = useState<Theme>(() => resolveTheme(themeMode));

  // Apply resolved theme + reduced-motion class to <html>.
  useEffect(() => {
    const theme = resolveTheme(themeMode);
    setResolved(theme);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('reduce-motion', reducedMotion);
  }, [themeMode, reducedMotion]);

  // Follow the OS when in system mode.
  useEffect(() => {
    if (themeMode !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolved(mq.matches ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', mq.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode]);

  const setThemeMode = useCallback((m: ThemeMode) => {
    saveSettings({ themeMode: m });
    setState((prev) => ({ ...prev, themeMode: m }));
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeMode(t), [setThemeMode]);

  const toggle = useCallback(() => {
    const next: Theme = resolveTheme(themeMode) === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  }, [themeMode, setThemeMode]);

  const setSound = useCallback((v: boolean) => {
    saveSettings({ sound: v });
    setState((prev) => ({ ...prev, sound: v }));
  }, []);

  const setReducedMotion = useCallback((v: boolean) => {
    saveSettings({ reducedMotion: v });
    setState((prev) => ({ ...prev, reducedMotion: v }));
  }, []);

  // Reflect external resets (e.g. Settings "reset all data") into context.
  useEffect(() => {
    const sync = () => {
      const s = getSettings();
      setState({ themeMode: s.themeMode, sound: s.sound, reducedMotion: s.reducedMotion });
    };
    window.addEventListener('mindloop:settings-reset', sync);
    return () => window.removeEventListener('mindloop:settings-reset', sync);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolved,
      themeMode,
      setThemeMode,
      toggle,
      setTheme,
      sound,
      setSound,
      reducedMotion,
      setReducedMotion,
    }),
    [resolved, themeMode, setThemeMode, toggle, setTheme, sound, setSound, reducedMotion, setReducedMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
