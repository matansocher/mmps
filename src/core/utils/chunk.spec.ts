import { chunk } from './chunk';

describe('chunk()', () => {
  it('should split an array into chunks of specified size', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle arrays that divide evenly', () => {
    const result = chunk([1, 2, 3, 4, 5, 6], 3);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it('should return array with single chunk when size is larger than array length', () => {
    const result = chunk([1, 2, 3], 10);
    expect(result).toEqual([[1, 2, 3]]);
  });

  it('should return empty array when input array is empty', () => {
    const result = chunk([], 2);
    expect(result).toEqual([]);
  });

  it('should return empty array when size is 0', () => {
    const result = chunk([1, 2, 3], 0);
    expect(result).toEqual([]);
  });

  it('should return empty array when size is negative', () => {
    const result = chunk([1, 2, 3], -5);
    expect(result).toEqual([]);
  });

  it('should handle size of 1', () => {
    const result = chunk([1, 2, 3], 1);
    expect(result).toEqual([[1], [2], [3]]);
  });

  it('should handle strings array', () => {
    const result = chunk(['a', 'b', 'c', 'd'], 2);
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('should handle objects array', () => {
    const result = chunk([{ id: 1 }, { id: 2 }, { id: 3 }], 2);
    expect(result).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  });

  it('should return empty array when input is not an array', () => {
    const result = chunk(null as any, 2);
    expect(result).toEqual([]);
  });
});
