import { describe, expect, it } from 'vitest';
import { haversineDistance, pathDistance, polygonArea } from './geo';

describe('haversineDistance()', () => {
  it('measures one degree of longitude on the equator', () => {
    expect(haversineDistance({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111_195, -1);
  });

  it('measures London → Paris', () => {
    expect(haversineDistance({ lat: 51.5074, lon: -0.1278 }, { lat: 48.8566, lon: 2.3522 }) / 1000).toBeCloseTo(343.5, 0);
  });
});

describe('pathDistance()', () => {
  it('sums segments', () => {
    const d = pathDistance([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 0, lon: 2 },
    ]);
    expect(d).toBeCloseTo(2 * 111_195, -1);
  });
});

describe('polygonArea()', () => {
  it('computes a 1°×1° cell at the equator', () => {
    const area = polygonArea([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 1, lon: 1 },
      { lat: 1, lon: 0 },
    ]);
    expect(area / 1e6).toBeCloseTo(12_364, -1);
  });

  it('is orientation independent and handles the antimeridian', () => {
    const area = polygonArea([
      { lat: 0, lon: 179.5 },
      { lat: 1, lon: 179.5 },
      { lat: 1, lon: -179.5 },
      { lat: 0, lon: -179.5 },
    ]);
    expect(area / 1e6).toBeCloseTo(12_364, -1);
  });

  it('returns 0 for fewer than 3 points', () => {
    expect(polygonArea([{ lat: 0, lon: 0 }])).toEqual(0);
  });
});
