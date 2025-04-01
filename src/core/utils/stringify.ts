export function stringify(body: Record<string, unknown>): string {
  if (Object.keys(body).length < 1) {
    return '';
  }
  return (
    Object.entries(body)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  );
}
