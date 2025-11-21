import { chunk } from './chunk';

describe('chunk()', () => {
  test.each([
    { array: [1, 2, 3, 4, 5], size: 2, expected: [[1, 2], [3, 4], [5]] },
    {
      array: [1, 2, 3, 4, 5, 6],
      size: 2,
      expected: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    },
    {
      array: [1, 2, 3, 4, 5],
      size: 3,
      expected: [
        [1, 2, 3],
        [4, 5],
      ],
    },
    { array: [1, 2, 3, 4, 5], size: 1, expected: [[1], [2], [3], [4], [5]] },
    { array: [1, 2, 3], size: 5, expected: [[1, 2, 3]] },
    { array: [], size: 2, expected: [] },
    { array: [1], size: 1, expected: [[1]] },
  ])('should return $expected when array is $array and size is $size', ({ array, size, expected }) => {
    expect(chunk(array, size)).toEqual(expected);
  });

  it('should work with different data types', () => {
    const stringArray = ['a', 'b', 'c', 'd', 'e'];
    expect(chunk(stringArray, 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);

    const objectArray = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(chunk(objectArray, 2)).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  });

  it('should throw error when size is 0', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be greater than 0');
  });

  it('should throw error when size is negative', () => {
    expect(() => chunk([1, 2, 3], -1)).toThrow('Chunk size must be greater than 0');
  });
});
