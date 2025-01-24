import fs from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { FILE_SUFFIX_TO_MIME_TYPE_MAP } from '@core/config';
import { GENERATIVE_MODEL_CLIENT_TOKEN } from './gemini.config';
import { GeminiClientProvider } from './interface';

@Injectable()
export class GeminiService {
  constructor(@Inject(GENERATIVE_MODEL_CLIENT_TOKEN) private readonly genAI: GeminiClientProvider) {}

  async getChatCompletion(prompt: string, userText: string | unknown[]): Promise<string> {
    let finalPrompt = `${prompt}.\n\n`;

    if (typeof userText === 'string') {
      finalPrompt += userText;
    } else { // array
      finalPrompt += userText.join('.');
    }

    const result = await this.genAI.flashModel.generateContent(finalPrompt);
    return result.response.text();
  }

  async generateContentFromFile(prompt: string, filePath: string): Promise<string> {
    const buffer = Buffer.from(fs.readFileSync(filePath)).toString('base64');
    const fileSuffix = path.extname(filePath).toLowerCase();
    const result = await this.genAI.flashModel.generateContent([
      {
        inlineData: {
          data: buffer,
          mimeType: FILE_SUFFIX_TO_MIME_TYPE_MAP[fileSuffix],
        },
      },
      { text: prompt },
    ]);
    return result.response.text();
  }
}
