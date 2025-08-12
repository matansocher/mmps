import { env } from 'node:process';
import { OpenAI } from 'openai';

let client: OpenAI;

export function provideOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.OPEN_AI_API_KEY });
  }
  return client;
}
