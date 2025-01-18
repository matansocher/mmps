import { translate } from '@vitalets/google-translate-api';

export async function getTranslationToEnglish(text: string): Promise<string> {
  const result = await translate(text, { to: 'en' });
  return result.text;
}
