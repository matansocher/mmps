export function maximumCircleScore(radiusKm: number): number {
  const normalizedRadius = Math.max(1, Math.min(150, radiusKm));
  return Math.round(5_000 * Math.exp(-(normalizedRadius - 1) / 75));
}
