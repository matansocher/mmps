import { formatNumber } from './format-number';

describe('formatNumber()', () => {
  test.each([
    { num: 0, expected: '0' },
    { num: 1, expected: '1' },
    { num: 10, expected: '10' },
    { num: 100, expected: '100' },
    { num: 999, expected: '999' },
    { num: 1000, expected: '1.0K' },
    { num: 1500, expected: '1.5K' },
    { num: 1234, expected: '1.2K' },
    { num: 9999, expected: '10.0K' },
    { num: 10000, expected: '10.0K' },
    { num: 50000, expected: '50.0K' },
    { num: 99999, expected: '100.0K' },
    { num: 100000, expected: '100.0K' },
    { num: 500000, expected: '500.0K' },
    { num: 999999, expected: '1000.0K' },
    { num: 1000000, expected: '1.0M' },
    { num: 1500000, expected: '1.5M' },
    { num: 1234567, expected: '1.2M' },
    { num: 10000000, expected: '10.0M' },
    { num: 99999999, expected: '100.0M' },
  ])('should return $expected when num is $num', ({ num, expected }) => {
    expect(formatNumber(num)).toEqual(expected);
  });
});
