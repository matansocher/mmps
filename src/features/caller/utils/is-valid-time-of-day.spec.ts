import { isValidTimeOfDay } from './is-valid-time-of-day';

describe('isValidTimeOfDay()', () => {
  test.each([
    { input: '0', expected: false },
    { input: '0830', expected: true },
    { input: '2359', expected: true },
    { input: '2460', expected: false },
    { input: '1161', expected: false },
    { input: '8a30', expected: false },
    { input: '830', expected: false },
  ])('should return $expected when input is $input', ({ input, expected }) => {
    expect(isValidTimeOfDay(input)).toEqual(expected);
  });
});
