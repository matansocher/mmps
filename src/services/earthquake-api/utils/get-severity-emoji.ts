export function getSeverityEmoji(magnitude: number): string {
  if (magnitude >= 8.0) return '⚠️'; // Great
  if (magnitude >= 7.0) return '🟣'; // Major
  if (magnitude >= 6.0) return '🔴'; // Strong
  if (magnitude >= 5.0) return '🟠'; // Moderate
  return '🟡'; // Minor
}
