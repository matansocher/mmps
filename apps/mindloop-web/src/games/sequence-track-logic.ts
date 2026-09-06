import { shuffle } from '../lib/utils';

export const TRACK_AREA = 320;
export const TRACK_RADIUS = 26;

export type TrackingDot = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly target: boolean;
};

export function getTrackingRoundConfig(round: number) {
  const total = Math.min(9, 5 + round);
  const targets = Math.min(4, 2 + Math.floor(round / 2));
  return {
    total,
    targets,
    speed: Math.min(156, 72 + round * 12),
    revealMs: Math.max(1100, 1800 - Math.max(0, round - 4) * 60),
    moveMs: Math.min(6000, 3200 + Math.max(0, round - 4) * 250),
    reward: targets * 20 + round * 10,
  };
}

export function makeTrackingDots(round: number): TrackingDot[] {
  const { total, targets, speed } = getTrackingRoundConfig(round);
  const slots = shuffle(Array.from({ length: 9 }, (_, i) => i)).slice(0, total);
  const targetIds = new Set(shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, targets));
  return slots.map((slot, id) => {
    const angle = Math.random() * Math.PI * 2;
    return {
      id,
      x: ((slot % 3) + 0.5) * TRACK_AREA / 3 + (Math.random() - 0.5) * 24,
      y: (Math.floor(slot / 3) + 0.5) * TRACK_AREA / 3 + (Math.random() - 0.5) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      target: targetIds.has(id),
    };
  });
}

export function stepTrackingDots(dots: readonly TrackingDot[], seconds: number): TrackingDot[] {
  const next = dots.map((dot) => {
    let { x, y, vx, vy } = dot;
    x += vx * seconds;
    y += vy * seconds;
    if (x < TRACK_RADIUS || x > TRACK_AREA - TRACK_RADIUS) {
      vx = x < TRACK_RADIUS ? Math.abs(vx) : -Math.abs(vx);
      x = Math.max(TRACK_RADIUS, Math.min(TRACK_AREA - TRACK_RADIUS, x));
    }
    if (y < TRACK_RADIUS || y > TRACK_AREA - TRACK_RADIUS) {
      vy = y < TRACK_RADIUS ? Math.abs(vy) : -Math.abs(vy);
      y = Math.max(TRACK_RADIUS, Math.min(TRACK_AREA - TRACK_RADIUS, y));
    }
    return { ...dot, x, y, vx, vy };
  });

  // Separate touching dots so no target can end hidden underneath another dot.
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i];
        const b = next[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= TRACK_RADIUS * 2) continue;
        const nx = distance === 0 ? 1 : dx / distance;
        const ny = distance === 0 ? 0 : dy / distance;
        const correction = (TRACK_RADIUS * 2 - distance) / 2;
        const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;
        if (approach > 0) {
          a.vx -= approach * nx;
          a.vy -= approach * ny;
          b.vx += approach * nx;
          b.vy += approach * ny;
        }
      }
    }
    for (const dot of next) {
      dot.x = Math.max(TRACK_RADIUS, Math.min(TRACK_AREA - TRACK_RADIUS, dot.x));
      dot.y = Math.max(TRACK_RADIUS, Math.min(TRACK_AREA - TRACK_RADIUS, dot.y));
    }
  }
  return next;
}
