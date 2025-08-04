import { getAnnounceMessage } from './get-announce-message';

describe('getAnnounceMessage', () => {
  test.each([
    { input: 500, expected: 'אני בדרך ומגיע עוד 500 מטרים' },
    { input: 50, expected: 'אני בדרך ומגיע עוד 50 מטרים' },
    { input: 999, expected: 'אני בדרך ומגיע עוד 999 מטרים' },
    { input: 1000, expected: 'אני בדרך ומגיע עוד 1.00 קילומטרים' },
    { input: 2500, expected: 'אני בדרך ומגיע עוד 2.50 קילומטרים' },
    { input: 1234, expected: 'אני בדרך ומגיע עוד 1.23 קילומטרים' },
    { input: 15000, expected: 'אני בדרך ומגיע עוד 15.00 קילומטרים' },
    { input: 0, expected: 'אני בדרך ומגיע עוד 0 מטרים' },
    { input: 123.45, expected: 'אני בדרך ומגיע עוד 123.45 מטרים' },
    { input: 1234.56, expected: 'אני בדרך ומגיע עוד 1.23 קילומטרים' },
    { input: 1234.567, expected: 'אני בדרך ומגיע עוד 1.23 קילומטרים' },
  ])('should return $expected when input is $input', ({ input, expected }) => {
    expect(getAnnounceMessage(input)).toEqual(expected);
  });
});
