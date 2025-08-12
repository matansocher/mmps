import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerativeModel } from '@google/generative-ai';
import { env } from 'node:process';

const GEMINI_FLASH_MODEL = 'gemini-1.5-flash';

let client: GenerativeModel;

export function provideGeminiClient() {
  if (!client) {
    const generativeAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    client = generativeAI.getGenerativeModel({ model: GEMINI_FLASH_MODEL });
  }
  return client;
}
