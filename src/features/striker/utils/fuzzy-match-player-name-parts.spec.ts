import { fuzzyMatchPlayerNameParts } from './fuzzy-match-player-name-parts';

describe('fuzzyMatchPlayerNameParts', () => {
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
