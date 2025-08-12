import { AssistantStream } from 'openai/lib/AssistantStream';
import { provideOpenAiClient } from '../../provide-openai-client';

export async function getThreadRunStream(assistantId: string, threadId: string): Promise<AssistantStream> {
  const client = provideOpenAiClient();
  return client.beta.threads.runs.stream(threadId, { assistant_id: assistantId });
}
