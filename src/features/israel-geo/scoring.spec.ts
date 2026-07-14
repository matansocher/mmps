import { distanceBetween, maximumCircleScore, scoreCircle } from './scoring';

describe('Israel Geo circle scoring', () => {
  it('returns zero distance for the same coordinates', () => {
    expect(distanceBetween({ lat: 32.0853, lng: 34.7818 }, { lat: 32.0853, lng: 34.7818 })).toEqual(0);
  });

  it('rewards smaller successful circles', () => {
    expect(maximumCircleScore(1)).toEqual(5_000);
    expect(maximumCircleScore(10)).toBeGreaterThan(maximumCircleScore(25));
    expect(maximumCircleScore(25)).toBeGreaterThan(maximumCircleScore(100));
  });

  it('awards the maximum radius-based score when the location is inside', () => {
    expect(scoreCircle(24_000, 25)).toEqual({
      points: maximumCircleScore(25),
      circleHit: true,
      outsideDistanceMeters: 0,
    });
  });

  it('applies an immediate miss penalty outside the circle', () => {
    const hit = scoreCircle(25_000, 25);
    const justOutside = scoreCircle(25_001, 25);
    expect(justOutside.circleHit).toEqual(false);
    expect(justOutside.points).toBeLessThanOrEqual(Math.round(hit.points * 0.5));
    expect(justOutside.outsideDistanceMeters).toEqual(1);
  });

  it('continues decaying based on distance beyond the circle', () => {
    expect(scoreCircle(30_000, 25).points).toBeGreaterThan(scoreCircle(80_000, 25).points);
  });
});
