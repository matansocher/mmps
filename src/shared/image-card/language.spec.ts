import { detectLanguage } from './language';

describe('detectLanguage()', () => {
  test.each([
    { text: 'הרכבת הבאה ב-15:10', expected: 'he' },
    { text: 'Next train at 15:10', expected: 'en' },
    { text: 'Mixed טקסט', expected: 'he' },
    { text: '', expected: 'en' },
  ])('should return $expected for "$text"', ({ text, expected }) => {
    expect(detectLanguage(text)).toEqual(expected);
  });
});
