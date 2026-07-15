export type Tier = { label: string; emoji: string; color: string };

export function ratingOf(score: number, max: number): Tier {
  const pct = max === 0 ? 0 : score / max;
  if (pct >= 1) return { label: 'PERFECT BRACKET', emoji: '🏆', color: '#FDB927' };
  if (pct >= 0.85) return { label: 'Playoff Legend', emoji: '🔥', color: '#F97316' };
  if (pct >= 0.65) return { label: 'All-Star', emoji: '⭐', color: '#3B82F6' };
  if (pct >= 0.45) return { label: 'Starter', emoji: '🏀', color: '#22C55E' };
  if (pct >= 0.25) return { label: 'Rookie', emoji: '🌱', color: '#9AA7B8' };
  return { label: 'Benchwarmer', emoji: '🪑', color: '#5F6B7C' };
}
