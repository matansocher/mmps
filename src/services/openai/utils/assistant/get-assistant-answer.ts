import { addMessageToThread } from './add-message-to-thread';
import { getThreadResponse } from './get-thread-response';
import { runThread } from './run-thread';

export async function getAssistantAnswer(assistantId: string, threadId: string, prompt: string): Promise<string> {
  await addMessageToThread(threadId, prompt, 'user');
  const { thread_id } = await runThread(assistantId, threadId);
  return getThreadResponse(thread_id);
}
