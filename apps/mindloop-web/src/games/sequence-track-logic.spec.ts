import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTrackingRoundConfig, makeTrackingDots, stepTrackingDots, TRACK_AREA, TRACK_RADIUS, type TrackingDot } from './sequence-track-logic';

afterEach(() => vi.restoreAllMocks());

function dot(patch: Partial<TrackingDot> = {}): TrackingDot {
  return { id: 0, x: 100, y: 100, vx: 72, vy: 0, target: true, ...patch };
}

describe('Tracking round progression', () => {
  it('continues challenging the player after target and speed caps are reached', () => {
    const early = getTrackingRoundConfig(7);
    const later = getTrackingRoundConfig(12);
    expect(later.targets).toEqual(early.targets);
    expect(later.speed).toEqual(early.speed);
    expect(later.moveMs).toBeGreaterThan(early.moveMs);
    expect(later.revealMs).toBeLessThan(early.revealMs);
    expect(later.reward).toBeGreaterThan(early.reward);
  });

  it('bounds physical and timing difficulty while rewards keep increasing', () => {
    for (let round = 1; round <= 100; round++) {
      const current = getTrackingRoundConfig(round);
      const previous = getTrackingRoundConfig(round - 1);
      expect(current.targets).toBeLessThanOrEqual(4);
      expect(current.total).toBeLessThanOrEqual(9);
      expect(current.speed).toBeLessThanOrEqual(156);
      expect(current.moveMs).toBeGreaterThanOrEqual(previous.moveMs);
      expect(current.moveMs).toBeLessThanOrEqual(6000);
      expect(current.revealMs).toBeLessThanOrEqual(previous.revealMs);
      expect(current.revealMs).toBeGreaterThanOrEqual(1100);
      expect(current.reward).toBeGreaterThan(previous.reward);
    }
  });
});

describe('makeTrackingDots', () => {
  it.each([0, 1, 2, 4, 20, 100])('guarantees a full, separated board at round %s even with repetitive randomness', (round) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const dots = makeTrackingDots(round);
    expect(dots.length).toEqual(Math.min(9, 5 + round));
    expect(new Set(dots.map((item) => item.id)).size).toEqual(dots.length);
    expect(dots.filter((item) => item.target).length).toEqual(Math.min(4, 2 + Math.floor(round / 2)));
    for (const item of dots) {
      expect(item.x).toBeGreaterThanOrEqual(TRACK_RADIUS);
      expect(item.y).toBeGreaterThanOrEqual(TRACK_RADIUS);
      expect(item.x).toBeLessThanOrEqual(TRACK_AREA - TRACK_RADIUS);
      expect(item.y).toBeLessThanOrEqual(TRACK_AREA - TRACK_RADIUS);
      expect(Math.hypot(item.vx, item.vy)).toBeLessThanOrEqual(156);
      for (const other of dots.filter((candidate) => candidate.id !== item.id)) {
        expect(Math.hypot(item.x - other.x, item.y - other.y)).toBeGreaterThan(TRACK_RADIUS * 2);
      }
    }
  });

  it('does not always make the first DOM buttons the targets', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const dots = makeTrackingDots(0);
    expect(dots[0].target).toEqual(false);
    expect(dots.some((item) => item.id >= 2 && item.target)).toEqual(true);
  });
});

describe('stepTrackingDots', () => {
  it.each([30, 60, 120])('moves the same distance per second at %s updates per second', (fps) => {
    let dots = [dot()];
    for (let i = 0; i < fps; i++) dots = stepTrackingDots(dots, 1 / fps);
    expect(dots[0].x).toBeCloseTo(172, 8);
    expect(dots[0].y).toEqual(100);
  });

  it('bounces off both walls and preserves identity without mutating the input', () => {
    const original = [dot({ x: 293, y: 27, vx: 120, vy: -120 })];
    const [moved] = stepTrackingDots(original, 1 / 60);
    expect(moved).toEqual({ ...original[0], x: 294, y: 26, vx: -120, vy: 120 });
    expect(original[0].x).toEqual(293);
    expect(moved.id).toEqual(original[0].id);
    expect(moved.target).toEqual(true);
  });

  it('separates colliding dots and bounces them instead of hiding one target under another', () => {
    const dots = [dot({ x: 100, vx: 72 }), dot({ id: 1, x: 151, vx: -72, target: false })];
    const [a, b] = stepTrackingDots(dots, 1 / 60);
    expect(b.x - a.x).toBeCloseTo(TRACK_RADIUS * 2);
    expect(a.vx).toEqual(-72);
    expect(b.vx).toEqual(72);
    expect(a.target).toEqual(true);
    expect(b.target).toEqual(false);
  });

  it('handles coincident centers without producing invalid coordinates', () => {
    const [a, b] = stepTrackingDots([dot({ vx: 0 }), dot({ id: 1, vx: 0 })], 1 / 60);
    expect(b.x - a.x).toEqual(TRACK_RADIUS * 2);
    expect(Number.isFinite(a.x + a.y + b.x + b.y)).toEqual(true);
  });

  it('keeps a crowded late-round board inside the arena and selectable after motion', () => {
    let seed = 42;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    });
    for (let game = 0; game < 10; game++) {
      let dots = makeTrackingDots(20);
      const identities = dots.map(({ id, target }) => ({ id, target }));
      for (let frame = 0; frame < 360; frame++) dots = stepTrackingDots(dots, 1 / 60);
      expect(dots.map(({ id, target }) => ({ id, target }))).toEqual(identities);
      for (const item of dots) {
        expect(item.x).toBeGreaterThanOrEqual(TRACK_RADIUS);
        expect(item.y).toBeGreaterThanOrEqual(TRACK_RADIUS);
        expect(item.x).toBeLessThanOrEqual(TRACK_AREA - TRACK_RADIUS);
        expect(item.y).toBeLessThanOrEqual(TRACK_AREA - TRACK_RADIUS);
        for (const other of dots.filter((candidate) => candidate.id !== item.id)) {
          expect(Math.hypot(item.x - other.x, item.y - other.y)).toBeGreaterThanOrEqual(TRACK_RADIUS * 2 - 0.5);
        }
      }
    }
  });
});
