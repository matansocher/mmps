import { AssistantStream } from 'openai/lib/AssistantStream';
import { Logger } from '@nestjs/common';

export async function streamResponse(threadId: string, stream: AssistantStream, onStreamData: (data: string) => void): Promise<string> {
  const logger = new Logger(streamResponse.name);
  let accumulatedContent = '';

  try {
    for await (const { event, data } of stream) {
      if (event === 'thread.message.delta' && data.delta.content) {
        const deltaContent = data.delta.content
          .filter((content) => content.type === 'text')
          .map((content) => content.text?.value)
          .join('');
        if (deltaContent) {
          accumulatedContent += deltaContent;
          onStreamData(accumulatedContent);
        }
      } else if (event === 'thread.run.completed') {
        onStreamData(accumulatedContent);
        return accumulatedContent;
      } else if (event === 'thread.run.failed' || event === 'thread.run.cancelled') {
        const { last_error, status } = data || {};
        logger.error(`Error running thread ${threadId} with error: ${last_error?.message}, code: ${last_error?.code}, status: ${status}`);
        return accumulatedContent;
      }
    }

    logger.error(`Stream ended unexpectedly for thread ${threadId}`);
    return accumulatedContent;
  } catch (error) {
    logger.error(`Exception running thread ${threadId}: ${error.message}`);
    return accumulatedContent;
  }
}
