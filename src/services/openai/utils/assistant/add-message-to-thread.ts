import { Message, MessageCreateParams } from 'openai/resources/beta/threads';
import { provideOpenAiClient } from '../../provide-openai-client';

export function addMessageToThread(threadId: string, content: string, role = 'user', fileId?: string): Promise<Message> {
  const client = provideOpenAiClient();
  return client.beta.threads.messages.create(threadId, <MessageCreateParams>{
    role,
    content,
    ...(fileId ? { attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }] } : {}),
  });
}
