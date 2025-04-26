import { AssistantStream } from 'openai/lib/AssistantStream';
import { Logger } from '@nestjs/common';

export async function streamResponse(threadId: string, stream: AssistantStream, onStreamData: (data: string) => void): Promise<string> {
  const logger = new Logger(streamResponse.name);
  let content = '';

  try {
    for await (const { event, data } of stream) {
      if (event === 'thread.message.delta') {
        const delta =
          data.delta?.content
            ?.filter((content) => content.type === 'text')
            .map((content) => content?.text?.value ?? '')
            .join('') || '';

        if (delta) {
          content += delta;
          onStreamData(content);
        }
      }

      if (event === 'thread.run.completed') break;

      if (event === 'thread.run.failed' || event === 'thread.run.cancelled') {
        const { last_error, status } = data || {};
        logger.error(`Thread ${threadId} failed: ${last_error?.message} (code: ${last_error?.code}), status: ${status}`);
        break;
      }
    }
  } catch (error) {
    logger.error(`Exception in thread ${threadId}: ${(error as Error).message}`);
  }

  return content;
}
