import { env } from 'node:process';
import { OpenAI } from 'openai';

let client: OpenAI;

export function provideOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 2 });
  }
  return client;
}
