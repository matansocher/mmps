export function simplifyAreaName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
}
