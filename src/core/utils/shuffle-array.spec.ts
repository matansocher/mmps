import { shuffleArray } from './shuffle-array';

describe('shuffleArray', () => {
  it('should return an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
  });

  it('should contain all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('should not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const originalCopy = [...input];
    shuffleArray(input);
    expect(input).toEqual(originalCopy);
  });

  it('should return empty array for empty input', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('should return single element array unchanged', () => {
    expect(shuffleArray([42])).toEqual([42]);
  });

  it('should work with string arrays', () => {
    const input = ['a', 'b', 'c'];
    const result = shuffleArray(input);
    expect(result).toHaveLength(3);
    expect(result.sort()).toEqual(['a', 'b', 'c']);
  });

  it('should work with object arrays', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const input = [obj1, obj2];
    const result = shuffleArray(input);
    expect(result).toHaveLength(2);
    expect(result).toContain(obj1);
    expect(result).toContain(obj2);
  });

  it('should eventually produce different orderings (statistical test)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<string>();

    // Run shuffle multiple times and collect unique orderings
    for (let i = 0; i < 100; i++) {
      results.add(JSON.stringify(shuffleArray(input)));
    }

    // With 10 elements, we should get multiple different orderings
    expect(results.size).toBeGreaterThan(1);
  });
});
