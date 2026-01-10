import type { Earthquake } from '../types';
import { formatEarthquake } from './format-earthquake';

describe('formatEarthquake', () => {
  const createMockEarthquake = (overrides: Partial<{
    properties: Partial<Earthquake['properties']>;
    geometry: Partial<Earthquake['geometry']>;
  }> = {}): Earthquake => ({
    type: 'Feature',
    id: 'test-quake-123',
    properties: {
      mag: 5.5,
      place: '10km SE of Tokyo, Japan',
      time: 1704067200000, // 2024-01-01 00:00:00 UTC
      updated: 1704067200000,
      tz: null,
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test-quake-123',
      detail: 'https://earthquake.usgs.gov/earthquakes/eventpage/test-quake-123.json',
      felt: null,
      cdi: null,
      mmi: null,
      alert: null,
      status: 'reviewed',
      tsunami: 0,
      sig: 500,
      net: 'us',
      code: 'test123',
      ids: ',test123,',
      sources: ',us,',
      types: ',origin,',
      nst: null,
      dmin: null,
      rms: 0.5,
      gap: null,
      magType: 'ml',
      type: 'earthquake',
      title: 'M 5.5 - 10km SE of Tokyo, Japan',
      ...overrides.properties,
    },
    geometry: {
      type: 'Point',
      coordinates: [139.6917, 35.6895, 25.0], // [longitude, latitude, depth]
      ...overrides.geometry,
    },
  });

  it('should format basic earthquake information', () => {
    const quake = createMockEarthquake();
    const result = formatEarthquake(quake);

    expect(result).toContain('*Magnitude 5.5*');
    expect(result).toContain('📍 10km SE of Tokyo, Japan');
    expect(result).toContain('📏 Depth: 25.0km (shallow)');
    expect(result).toContain('🌐 Coordinates: 35.690°, 139.692°');
    expect(result).toContain('[Details]');
  });

  it('should include severity emoji based on magnitude', () => {
    const quake = createMockEarthquake({ properties: { mag: 7.5 } });
    const result = formatEarthquake(quake);

    expect(result).toContain('🟣');
  });

  it('should include time in readable format', () => {
    const quake = createMockEarthquake();
    const result = formatEarthquake(quake);

    expect(result).toContain('🕐');
  });

  it('should include tsunami warning when tsunami is 1', () => {
    const quake = createMockEarthquake({ properties: { tsunami: 1 } });
    const result = formatEarthquake(quake);

    expect(result).toContain('🌊 *TSUNAMI WARNING*');
  });

  it('should not include tsunami warning when tsunami is 0', () => {
    const quake = createMockEarthquake({ properties: { tsunami: 0 } });
    const result = formatEarthquake(quake);

    expect(result).not.toContain('TSUNAMI WARNING');
  });

  it('should include alert level when present', () => {
    const quake = createMockEarthquake({ properties: { alert: 'yellow' } });
    const result = formatEarthquake(quake);

    expect(result).toContain('⚠️  Alert Level:');
    expect(result).toContain('🟡');
    expect(result).toContain('YELLOW');
  });

  it('should include red alert with correct emoji', () => {
    const quake = createMockEarthquake({ properties: { alert: 'red' } });
    const result = formatEarthquake(quake);

    expect(result).toContain('🔴');
    expect(result).toContain('RED');
  });

  it('should not include alert level when alert is null', () => {
    const quake = createMockEarthquake({ properties: { alert: null } });
    const result = formatEarthquake(quake);

    expect(result).not.toContain('Alert Level');
  });

  it('should include felt count when present', () => {
    const quake = createMockEarthquake({ properties: { felt: 1500 } });
    const result = formatEarthquake(quake);

    expect(result).toContain('👥 Felt by: 1500 people');
  });

  it('should not include felt count when null', () => {
    const quake = createMockEarthquake({ properties: { felt: null } });
    const result = formatEarthquake(quake);

    expect(result).not.toContain('Felt by');
  });

  it('should not include felt count when undefined', () => {
    const quake = createMockEarthquake();
    delete (quake.properties as any).felt;
    const result = formatEarthquake(quake);

    expect(result).not.toContain('Felt by');
  });

  it('should include details link', () => {
    const quake = createMockEarthquake();
    const result = formatEarthquake(quake);

    expect(result).toContain('🔗 [Details](https://earthquake.usgs.gov/earthquakes/eventpage/test-quake-123)');
  });

  it('should format deep earthquake depth correctly', () => {
    const quake = createMockEarthquake({
      geometry: { coordinates: [139.6917, 35.6895, 500.0] },
    });
    const result = formatEarthquake(quake);

    expect(result).toContain('500.0km (deep)');
  });

  it('should format intermediate depth earthquake correctly', () => {
    const quake = createMockEarthquake({
      geometry: { coordinates: [139.6917, 35.6895, 150.0] },
    });
    const result = formatEarthquake(quake);

    expect(result).toContain('150.0km (intermediate)');
  });

  it('should format magnitude with one decimal place', () => {
    const quake = createMockEarthquake({ properties: { mag: 6.789 } });
    const result = formatEarthquake(quake);

    expect(result).toContain('*Magnitude 6.8*');
  });

  it('should format coordinates with three decimal places', () => {
    const quake = createMockEarthquake({
      geometry: { coordinates: [139.12345, 35.67891, 25.0] },
    });
    const result = formatEarthquake(quake);

    expect(result).toContain('35.679°, 139.123°');
  });
});
