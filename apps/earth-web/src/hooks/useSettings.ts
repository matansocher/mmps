import { useCallback, useMemo } from 'react';
import { isRecord } from '../lib/storage';
import type { Settings } from '../types';
import { usePersistentState } from './usePersistentState';

export const DEFAULT_SETTINGS: Settings = {
  mapStyle: 'photorealistic',
  countryLabels: true,
  cityLabels: true,
  borders: true,
  grid: false,
  atmosphere: true,
  sunLighting: false,
  units: 'metric',
};

const MAP_STYLES = ['photorealistic', 'satellite', 'hybrid', 'roadmap'];

// Older saves had a single `labels` flag for countries and cities.
type StoredSettings = Omit<Settings, 'countryLabels' | 'cityLabels'> & {
  readonly countryLabels?: boolean;
  readonly cityLabels?: boolean;
  readonly labels?: boolean;
};

const isOptionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean';

function isStoredSettings(value: unknown): value is StoredSettings {
  return (
    isRecord(value) &&
    MAP_STYLES.includes(value.mapStyle as string) &&
    ['borders', 'grid', 'atmosphere', 'sunLighting'].every((k) => typeof value[k] === 'boolean') &&
    ['labels', 'countryLabels', 'cityLabels'].every((k) => isOptionalBoolean(value[k])) &&
    (value.units === 'metric' || value.units === 'imperial')
  );
}

export function normalizeSettings({ labels, countryLabels, cityLabels, ...rest }: StoredSettings): Settings {
  return { ...rest, countryLabels: countryLabels ?? labels ?? true, cityLabels: cityLabels ?? labels ?? true };
}

export function useSettings(): readonly [Settings, (patch: Partial<Settings>) => void] {
  const [stored, setSettings] = usePersistentState<StoredSettings>('settings', DEFAULT_SETTINGS, isStoredSettings);
  const settings = useMemo(() => normalizeSettings(stored), [stored]);
  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...normalizeSettings(prev), ...patch })), [setSettings]);
  return [settings, update] as const;
}
