import { get as _get } from 'lodash';
import { provideOpenAiClient } from '../../provide-openai-client';

export async function getThreadResponse(threadId: string): Promise<string> {
  const client = provideOpenAiClient();
  const result = await client.beta.threads.messages.list(threadId);
  return _get(result, 'data[0].content[0].text.value', null);
}
