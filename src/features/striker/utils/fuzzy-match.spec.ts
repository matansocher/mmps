import { fuzzyMatchPlayerName, fuzzyMatchPlayerNameParts } from './fuzzy-match';

describe('fuzzyMatchPlayerName()', () => {
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
    expect(fuzzyMatchPlayerName('Ronalod', 'Ronaldo')).toBe(false);
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
    expect(fuzzyMatchPlayerName('ONeill', "O'Neill")).toBe(true);
    expect(fuzzyMatchPlayerName('van Dijk', 'vanDijk')).toBe(true);
  });

  it('should handle empty strings', () => {
    expect(fuzzyMatchPlayerName('', '')).toBe(true);
    expect(fuzzyMatchPlayerName('Messi', '')).toBe(false);
  });
});

describe('fuzzyMatchPlayerNameParts()', () => {
  it('should match full name', () => {
    expect(fuzzyMatchPlayerNameParts('Kylian Mbappe', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Cristiano Ronaldo', 'Cristiano Ronaldo')).toBe(true);
  });

  it('should match first name only', () => {
    expect(fuzzyMatchPlayerNameParts('Kylian', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Cristiano', 'Cristiano Ronaldo')).toBe(true);
  });

  it('should match last name only', () => {
    expect(fuzzyMatchPlayerNameParts('Mbappe', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Ronaldo', 'Cristiano Ronaldo')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('di gregorio', 'Michele Di Gregorio')).toBe(true);
  });

  it('should match with accents', () => {
    expect(fuzzyMatchPlayerNameParts('Mbappe', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Muller', 'Thomas Müller')).toBe(true);
  });

  it('should match with typos in any name part', () => {
    expect(fuzzyMatchPlayerNameParts('Kylan', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Messi', 'Lionel Messi')).toBe(true);
  });

  it('should handle multi-part names', () => {
    expect(fuzzyMatchPlayerNameParts('van Dijk', 'Virgil van Dijk')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Virgil', 'Virgil van Dijk')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Dijk', 'Virgil van Dijk')).toBe(true);
  });

  it('should not match completely different names', () => {
    expect(fuzzyMatchPlayerNameParts('Messi', 'Cristiano Ronaldo')).toBe(false);
    expect(fuzzyMatchPlayerNameParts('Kane', 'Erling Haaland')).toBe(false);
  });

  it('should match with case insensitivity', () => {
    expect(fuzzyMatchPlayerNameParts('MBAPPE', 'Kylian Mbappé')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('ronaldo', 'Cristiano Ronaldo')).toBe(true);
  });

  it('should handle single name players', () => {
    expect(fuzzyMatchPlayerNameParts('Neymar', 'Neymar')).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Ronaldinho', 'Ronaldinho')).toBe(true);
  });

  it('should handle partial matches with special characters', () => {
    expect(fuzzyMatchPlayerNameParts('ONeill', "Sean O'Neill")).toBe(true);
    expect(fuzzyMatchPlayerNameParts('Saint Germain', 'Paris Saint-Germain')).toBe(true);
  });
});
