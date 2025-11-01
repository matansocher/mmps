import { calculateSimilarity } from './calculate-similarity';

describe('calculateSimilarity', () => {
  it('should return 100 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(100);
    expect(calculateSimilarity('Mbappe', 'Mbappe')).toBe(100);
  });

  it('should return 100 for strings that match after normalization', () => {
    expect(calculateSimilarity('Mbappé', 'Mbappe')).toBe(100);
    expect(calculateSimilarity('HELLO', 'hello')).toBe(100);
  });

  it('should return high similarity for similar strings', () => {
    const similarity = calculateSimilarity('Ronaldo', 'Ronald');
    expect(similarity).toBeGreaterThan(85);
    expect(similarity).toBeLessThan(100);
  });

  it('should return low similarity for very different strings', () => {
    const similarity = calculateSimilarity('Messi', 'Ronaldo');
    expect(similarity).toBeLessThan(50);
  });

  it('should handle empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(100);
    expect(calculateSimilarity('hello', '')).toBe(0);
    expect(calculateSimilarity('', 'world')).toBe(0);
  });

  it('should calculate correct similarity percentage', () => {
    // "cat" vs "hat" - 1 character difference in 3 characters = 66.67%
    const similarity = calculateSimilarity('cat', 'hat');
    expect(similarity).toBeCloseTo(66.67, 1);
  });

  it('should handle special characters and accents', () => {
    expect(calculateSimilarity("O'Neill", 'oneill')).toBe(100);
    expect(calculateSimilarity('Saint-Germain', 'saintgermain')).toBe(100);
  });
});
