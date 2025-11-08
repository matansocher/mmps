import { FUZZY_MATCH_THRESHOLD } from '../striker.config';
import { calculateSimilarity } from './calculate-similarity';
import { normalizeString } from './normalize-string';


export function fuzzyMatchPlayerName(guess: string, correctName: string, threshold: number = FUZZY_MATCH_THRESHOLD): boolean {
  const similarity = calculateSimilarity(guess, correctName);
  return similarity >= threshold;
}

export function fuzzyMatchPlayerNameParts(guess: string, correctName: string): boolean {
  const normalizedGuess = normalizeString(guess);
  const nameParts = correctName.split(' ').map(normalizeString);

  // Check against individual name parts
  for (const part of nameParts) {
    if (fuzzyMatchPlayerName(normalizedGuess, part, FUZZY_MATCH_THRESHOLD)) {
      return true;
    }
  }

  // Check against consecutive combinations of name parts (for multi-word surnames like "di gregorio", "van dijk")
  for (let i = 0; i < nameParts.length; i++) {
    for (let j = i + 1; j <= nameParts.length; j++) {
      const combinedPart = nameParts.slice(i, j).join(' ');
      if (fuzzyMatchPlayerName(normalizedGuess, combinedPart, FUZZY_MATCH_THRESHOLD)) {
        return true;
      }
    }
  }

  // Check against full name
  return fuzzyMatchPlayerName(normalizedGuess, correctName, FUZZY_MATCH_THRESHOLD);
}
