import { generateRandomString } from './generate-random-string';

describe('generateRandomString', () => {
  it('should return string of specified length', () => {
    expect(generateRandomString(10)).toHaveLength(10);
    expect(generateRandomString(5)).toHaveLength(5);
    expect(generateRandomString(100)).toHaveLength(100);
  });

  it('should return empty string for size 0', () => {
    expect(generateRandomString(0)).toBe('');
  });

  it('should only contain alphanumeric characters', () => {
    const result = generateRandomString(1000);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should generate different strings on subsequent calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(generateRandomString(20));
    }
    // All 100 strings should be unique (extremely high probability)
    expect(results.size).toBe(100);
  });

  it('should include uppercase letters', () => {
    // Generate a long string to ensure we get uppercase
    const result = generateRandomString(1000);
    expect(result).toMatch(/[A-Z]/);
  });

  it('should include lowercase letters', () => {
    const result = generateRandomString(1000);
    expect(result).toMatch(/[a-z]/);
  });

  it('should include numbers', () => {
    const result = generateRandomString(1000);
    expect(result).toMatch(/[0-9]/);
  });

  it('should handle size of 1', () => {
    const result = generateRandomString(1);
    expect(result).toHaveLength(1);
    expect(result).toMatch(/^[A-Za-z0-9]$/);
  });
});
