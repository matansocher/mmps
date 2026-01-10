import { getTableTemplate } from './get-table-template';

describe('getTableTemplate', () => {
  it('should generate table with single item', () => {
    const items = [{ name: 'Item 1', value: 100 }];
    const result = getTableTemplate(items);

    expect(result).toContain('1');
    expect(result).toContain('Item 1');
    expect(result).toContain('100');
    expect(result).toMatch(/^```\n/);
    expect(result).toMatch(/\n```$/);
  });

  it('should generate table with multiple items', () => {
    const items = [
      { name: 'Apple', value: 10 },
      { name: 'Banana', value: 20 },
      { name: 'Cherry', value: 30 },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('1');
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).toContain('Apple');
    expect(result).toContain('Banana');
    expect(result).toContain('Cherry');
  });

  it('should include midValue when provided', () => {
    const items = [
      { name: 'Stock A', midValue: 50, value: 100 },
      { name: 'Stock B', midValue: 75, value: 150 },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('50');
    expect(result).toContain('75');
    expect(result).toContain('100');
    expect(result).toContain('150');
  });

  it('should handle string values', () => {
    const items = [
      { name: 'Team A', value: '1st' },
      { name: 'Team B', value: '2nd' },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('1st');
    expect(result).toContain('2nd');
  });

  it('should handle mixed midValue types', () => {
    const items = [
      { name: 'Item A', midValue: 'High', value: 100 },
      { name: 'Item B', midValue: 'Low', value: 50 },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('High');
    expect(result).toContain('Low');
  });

  it('should pad names for alignment', () => {
    const items = [
      { name: 'A', value: 1 },
      { name: 'Very Long Name', value: 2 },
    ];
    const result = getTableTemplate(items);
    const lines = result.split('\n');

    // Both data lines should have same length due to padding
    const dataLine1 = lines[1];
    const dataLine2 = lines[2];
    expect(dataLine1.length).toBe(dataLine2.length);
  });

  it('should pad values for alignment', () => {
    const items = [
      { name: 'Item', value: 1 },
      { name: 'Item', value: 1000 },
    ];
    const result = getTableTemplate(items);
    const lines = result.split('\n');

    // Values should be right-aligned
    expect(lines[1].length).toBe(lines[2].length);
  });

  it('should wrap output in markdown code block', () => {
    const items = [{ name: 'Test', value: 1 }];
    const result = getTableTemplate(items);

    expect(result.startsWith('```\n')).toBe(true);
    expect(result.endsWith('\n```')).toBe(true);
  });

  it('should handle indices with multiple digits', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      name: `Item ${i + 1}`,
      value: i + 1,
    }));
    const result = getTableTemplate(items);

    expect(result).toContain(' 1');
    expect(result).toContain('10');
    expect(result).toContain('11');
    expect(result).toContain('12');
  });

  it('should handle zero values', () => {
    const items = [
      { name: 'Zero', value: 0 },
      { name: 'NonZero', value: 100 },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('0');
    expect(result).toContain('100');
  });

  it('should handle negative values', () => {
    const items = [
      { name: 'Negative', value: -50 },
      { name: 'Positive', value: 50 },
    ];
    const result = getTableTemplate(items);

    expect(result).toContain('-50');
    expect(result).toContain('50');
  });

  it('should handle undefined midValue', () => {
    const items = [{ name: 'Item', value: 100 }];
    const result = getTableTemplate(items);

    expect(result).toContain('undefined');
  });

  it('should produce consistent format with all parameters', () => {
    const items = [
      { name: 'Team Alpha', midValue: 15, value: 45 },
      { name: 'Team Beta', midValue: 12, value: 38 },
      { name: 'Team Gamma', midValue: 10, value: 32 },
    ];
    const result = getTableTemplate(items);
    const lines = result.split('\n').filter((line) => line && line !== '```');

    // All data lines should have equal length
    const lengths = lines.map((l) => l.length);
    expect(new Set(lengths).size).toBe(1);
  });
});
