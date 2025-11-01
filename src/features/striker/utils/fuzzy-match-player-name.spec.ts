import { fuzzyMatchPlayerName } from './fuzzy-match-player-name';

describe('fuzzyMatchPlayerName', () => {
  it('should match identical names', () => {
    expect(fuzzyMatchPlayerName('Messi', 'Messi')).toBe(true);
    expect(fuzzyMatchPlayerName('Ronaldo', 'Ronaldo')).toBe(true);
  });

  it('should match names with accents', () => {
    expect(fuzzyMatchPlayerName('Mbappe', 'Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerName('Muller', 'Müller')).toBe(true);
  });

  it('should match case-insensitive names', () => {
    expect(fuzzyMatchPlayerName('MESSI', 'messi')).toBe(true);
    expect(fuzzyMatchPlayerName('RoNaLdO', 'ronaldo')).toBe(true);
  });

  it('should match names with small typos (80% threshold)', () => {
    expect(fuzzyMatchPlayerName('Messy', 'Messi')).toBe(true);
    expect(fuzzyMatchPlayerName('Ronalod', 'Ronaldo')).toBe(true);
  });

  it('should not match completely different names', () => {
    expect(fuzzyMatchPlayerName('Messi', 'Ronaldo')).toBe(false);
    expect(fuzzyMatchPlayerName('Kane', 'Benzema')).toBe(false);
  });

  it('should respect custom threshold', () => {
    // "Mess" vs "Messi" is 80% similar
    expect(fuzzyMatchPlayerName('Mess', 'Messi', 80)).toBe(true);
    // But not 90% similar
    expect(fuzzyMatchPlayerName('Mess', 'Messi', 90)).toBe(false);
  });

  it('should handle special characters', () => {
    expect(fuzzyMatchPlayerName("ONeill", "O'Neill")).toBe(true);
    expect(fuzzyMatchPlayerName('van Dijk', 'vanDijk')).toBe(true);
  });

  it('should handle empty strings', () => {
    expect(fuzzyMatchPlayerName('', '')).toBe(true);
    expect(fuzzyMatchPlayerName('Messi', '')).toBe(false);
  });
});
