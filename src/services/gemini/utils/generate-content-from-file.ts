import fs from 'fs';
import path from 'path';
import { FILE_SUFFIX_TO_MIME_TYPE_MAP } from '@core/config';
import { provideGeminiClient } from '../provide-gemini-client';

export async function generateContentFromFile(prompt: string, filePath: string): Promise<string> {
  const flashModel = provideGeminiClient();
  const buffer = Buffer.from(fs.readFileSync(filePath)).toString('base64');
  const fileSuffix = path.extname(filePath).toLowerCase();
  const result = await flashModel.generateContent([
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
