export function stringify(body: Record<string, unknown>): string {
  if (Object.keys(body).length < 1) {
    return '';
  }
  return Object.entries(body)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}
