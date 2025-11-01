import { fuzzyMatchPlayerName, normalizeString } from '.';

/**
 * Check if a guess matches any part of a player's full name
 * Useful for matching "Mbappe" to "Kylian Mbappé"
 */
export function fuzzyMatchPlayerNameParts(guess: string, correctName: string): boolean {
  const normalizedGuess = normalizeString(guess);
  const nameParts = correctName.split(' ').map(normalizeString);

  for (const part of nameParts) {
    if (fuzzyMatchPlayerName(normalizedGuess, part, 80)) {
      return true;
    }
  }

  return fuzzyMatchPlayerName(normalizedGuess, correctName, 80);
}
