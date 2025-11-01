import { fuzzyMatchPlayerName, normalizeString } from '.';

/**
 * Check if a guess matches any part of a player's full name
 * Useful for matching "Mbappe" to "Kylian Mbappé" or "di gregorio" to "Michele Di Gregorio"
 */
export function fuzzyMatchPlayerNameParts(guess: string, correctName: string): boolean {
  const normalizedGuess = normalizeString(guess);
  const nameParts = correctName.split(' ').map(normalizeString);

  // Check against individual name parts
  for (const part of nameParts) {
    if (fuzzyMatchPlayerName(normalizedGuess, part, 80)) {
      return true;
    }
  }

  // Check against consecutive combinations of name parts (for multi-word surnames like "di gregorio", "van dijk")
  for (let i = 0; i < nameParts.length; i++) {
    for (let j = i + 1; j <= nameParts.length; j++) {
      const combinedPart = nameParts.slice(i, j).join(' ');
      if (fuzzyMatchPlayerName(normalizedGuess, combinedPart, 80)) {
        return true;
      }
    }
  }

  // Check against full name
  return fuzzyMatchPlayerName(normalizedGuess, correctName, 80);
}
