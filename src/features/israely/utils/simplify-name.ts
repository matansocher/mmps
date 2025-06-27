export function simplifyCityName(name: string): string {
  if (!name) {
    const a = 5;
  }
  return name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
}
