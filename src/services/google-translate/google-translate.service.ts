import { Injectable } from '@nestjs/common';
import { translate } from '@vitalets/google-translate-api';

@Injectable()
export class GoogleTranslateService {
  async getTranslationToEnglish(text: string): Promise<string> {
    const result = await translate(text, { to: 'en' });
    return result.text;
  }
}
