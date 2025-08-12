import Anthropic from '@anthropic-ai/sdk';
import { env } from 'node:process';

let client: Anthropic;

export function provideAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}
