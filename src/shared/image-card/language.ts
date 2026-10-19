export type ImageLanguage = 'he' | 'en';

const HEBREW_CHAR_REGEX = /[\u0590-\u05FF]/;

export function detectLanguage(text: string): ImageLanguage {
  return HEBREW_CHAR_REGEX.test(text) ? 'he' : 'en';
}
