import { describe, expect, it } from 'vitest';
import { getEarthConfig } from './earth.api.controller';

describe('getEarthConfig()', () => {
  it('prefers the dedicated browser key', () => {
    const config = getEarthConfig({ EARTH_GOOGLE_MAPS_BROWSER_KEY: 'browser', GOOGLE_MAPS_API_KEY: 'shared' });
    expect(config?.googleMapsKey).toEqual('browser');
  });

  it('falls back to the shared maps key', () => {
    expect(getEarthConfig({ GOOGLE_MAPS_API_KEY: 'shared' })?.googleMapsKey).toEqual('shared');
  });

  it('returns null when no key is configured', () => {
    expect(getEarthConfig({})).toBeNull();
  });
});
