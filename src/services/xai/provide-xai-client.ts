import { env } from 'node:process';
import { OpenAI } from 'openai';

let xai: OpenAI;

export function provideXAiClient(): OpenAI {
  if (!xai) {
    xai = new OpenAI({ apiKey: env.XAI_API_KEY });
  }
  return xai;
}
