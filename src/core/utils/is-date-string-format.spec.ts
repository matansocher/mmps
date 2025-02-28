import { isDateStringFormat } from './is-date-string-format';

describe('isDateStringFormat()', () => {
  test.each([
    { expected: false, input: '' },
    { expected: false, input: '2025' },
    { expected: false, input: '2025-01' },
    { expected: false, input: '2025.01.01' },
    { expected: true, input: '2025-01-01' },
  ])('should return $expected when input is $input', ({ input, expected }) => {
    expect(isDateStringFormat(input)).toEqual(expected);
  });
});
