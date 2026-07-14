export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1_000) return `${distanceMeters.toLocaleString()} m`;
  return `${(distanceMeters / 1_000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`;
}

export function scoreLabel(score: number): string {
  if (score >= 22_500) return 'Local legend';
  if (score >= 17_500) return 'Sharp explorer';
  if (score >= 12_500) return 'Strong navigator';
  if (score >= 7_500) return 'Road-trip ready';
  return 'Keep exploring';
}
