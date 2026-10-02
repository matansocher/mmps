import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from './useSettings';

describe('normalizeSettings()', () => {
  it('should migrate the legacy single labels flag to country and city names', () => {
    const legacy = { mapStyle: 'satellite', labels: false, borders: true, grid: false, atmosphere: true, sunLighting: false, units: 'metric' } as const;
    expect(normalizeSettings(legacy)).toEqual({ ...DEFAULT_SETTINGS, mapStyle: 'satellite', countryLabels: false, cityLabels: false });
  });

  it('should keep explicit country and city flags', () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, countryLabels: false, cityLabels: true })).toEqual({ ...DEFAULT_SETTINGS, countryLabels: false, cityLabels: true });
  });
});
