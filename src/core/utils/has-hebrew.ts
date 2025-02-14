export function hasHebrew(str: string): boolean {
  return /[\u0590-\u05FF]/.test(str);
}
