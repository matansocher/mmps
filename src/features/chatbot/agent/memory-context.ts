import { createMiddleware } from 'langchain';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { formatMemoriesForPrompt, getMemories } from '@shared/memories';

const logger = new Logger('chatbot:memory-context');

export type MemoryContextOptions = {
  readonly maxFacts: number;
  readonly maxChars: number;
};

// Appends the user's long-term memories to the system prompt of every model call. Done per request
// (not as a message) so the facts never get checkpointed or summarized and edits apply immediately.
export function createMemoryContextMiddleware({ maxFacts, maxChars }: MemoryContextOptions) {
  return createMiddleware({
    name: 'MemoryContextMiddleware',
    wrapModelCall: async (request, handler) => {
      let block = '';
      try {
        block = formatMemoriesForPrompt(await getMemories(MY_USER_ID, maxFacts), maxChars);
      } catch (err) {
        logger.warn(`Failed to load long-term memories: ${getErrorMessage(err)}`);
      }
      if (!block) {
        return handler(request);
      }
      return handler({ ...request, systemMessage: request.systemMessage.concat(`\n\n${block}`) });
    },
  });
}
