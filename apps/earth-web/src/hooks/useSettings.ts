import { useCallback } from 'react';
import { isRecord } from '../lib/storage';
import type { Settings } from '../types';
import { usePersistentState } from './usePersistentState';

export const DEFAULT_SETTINGS: Settings = {
  mapStyle: 'photorealistic',
  labels: true,
  borders: true,
  grid: false,
  atmosphere: true,
  sunLighting: false,
  units: 'metric',
};

const MAP_STYLES = ['photorealistic', 'satellite', 'hybrid', 'roadmap'];

function isSettings(value: unknown): value is Settings {
  return (
    isRecord(value) &&
    MAP_STYLES.includes(value.mapStyle as string) &&
    ['labels', 'borders', 'grid', 'atmosphere', 'sunLighting'].every((k) => typeof value[k] === 'boolean') &&
    (value.units === 'metric' || value.units === 'imperial')
  );
}

export function useSettings(): readonly [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = usePersistentState<Settings>('settings', DEFAULT_SETTINGS, isSettings);
  const update = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), [setSettings]);
  return [settings, update] as const;
}
