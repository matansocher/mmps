import { FILE_SUFFIX_TO_MIME_TYPE_MAP } from '@services/ai/ai.config';
import fs from 'fs';
import path from 'path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, GEMINI_FLASH_MODEL } from '@services/gemini/gemini.config';

@Injectable()
export class GeminiService implements OnModuleInit {
  private flashModel: GenerativeModel;

  onModuleInit(): void {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.flashModel = genAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });
  }

  async getChatCompletion(prompt: string, userText: string | unknown[]): Promise<string> {
    let finalPrompt = `${prompt}.\n\n`;

    if (typeof userText === 'string') {
      finalPrompt += userText;
    } else { // array
      finalPrompt += userText.join('');
    }

    const result = await this.flashModel.generateContent(finalPrompt);
    return result.response.text();
  }

  async generateContentFromFile(prompt: string, filePath: string): Promise<string> {
    const buffer = Buffer.from(fs.readFileSync(filePath)).toString('base64');
    const fileSuffix = path.extname(filePath).toLowerCase();
    const result = await this.flashModel.generateContent([
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
