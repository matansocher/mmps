import { normalizeString } from './normalize-string';

describe('normalizeString', () => {
  it('should convert to lowercase', () => {
    expect(normalizeString('HELLO')).toBe('hello');
    expect(normalizeString('WoRlD')).toBe('world');
  });

  it('should remove accents and diacritics', () => {
    expect(normalizeString('Mbappé')).toBe('mbappe');
    expect(normalizeString('José')).toBe('jose');
    expect(normalizeString('Müller')).toBe('muller');
  });

  it('should remove special characters except spaces', () => {
    expect(normalizeString("O'Neill")).toBe('oneill');
    expect(normalizeString('Saint-Germain')).toBe('saintgermain');
    expect(normalizeString('player@123')).toBe('player123');
  });

  it('should preserve spaces', () => {
    expect(normalizeString('Kylian Mbappé')).toBe('kylian mbappe');
    expect(normalizeString('van der Sar')).toBe('van der sar');
  });

  it('should trim whitespace', () => {
    expect(normalizeString('  hello  ')).toBe('hello');
    expect(normalizeString('  world  ')).toBe('world');
  });

  it('should handle empty strings', () => {
    expect(normalizeString('')).toBe('');
    expect(normalizeString('   ')).toBe('');
  });

  it('should handle combined transformations', () => {
    expect(normalizeString('  Cristiano Ronaldo  ')).toBe('cristiano ronaldo');
    expect(normalizeString("N'Golo Kanté")).toBe('ngolo kante');
  });
});
