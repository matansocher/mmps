import { calculateSimilarity } from './calculate-similarity';

export function fuzzyMatchPlayerName(guess: string, correctName: string, threshold: number = 80): boolean {
  const similarity = calculateSimilarity(guess, correctName);
  return similarity >= threshold;
}
