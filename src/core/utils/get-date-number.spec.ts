import { getDateNumber } from './get-date-number';

describe('getDateNumber()', () => {
  test.each([
    { input: 1, expected: '01' },
    { input: 6, expected: '06' },
    { input: 10, expected: '10' },
    { input: 11, expected: '11' },
  ])('should return $expected when input is $input', ({ input, expected }) => {
    expect(getDateNumber(input)).toEqual(expected);
  });
});
