import { Thread } from 'openai/resources/beta/threads';
import { provideOpenAiClient } from '../../provide-openai-client';

export function createThread(): Promise<Thread> {
  const client = provideOpenAiClient();
  return client.beta.threads.create();
}
