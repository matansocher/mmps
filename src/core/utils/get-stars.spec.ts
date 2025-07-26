import { getStars } from './get-stars';

describe('getStars()', () => {
  test.each([
    { amount: 0, total: 5, expected: '☆☆☆☆☆' },
    { amount: 1, total: 5, expected: '★☆☆☆☆' },
    { amount: 1, total: 5, expected: '★☆☆☆☆' },
    { amount: 2, total: 5, expected: '★★☆☆☆' },
    { amount: 5, total: 5, expected: '★★★★★' },
    { amount: 3, total: 7, expected: '★★★☆☆☆☆' },
    { amount: 10, total: 10, expected: '★★★★★★★★★★' },
    { amount: 6, total: 5, expected: '★★★★★' },
  ])('should return $expected when input is $input', ({ amount, total, expected }) => {
    expect(getStars(amount, total)).toEqual(expected);
  });
});
