import { AnyAgentMiddleware, summarizationMiddleware } from 'langchain';
import { Logger } from '@core/utils';

const logger = new Logger('chatbot:safe-summarization');

// LangChain's createSummary() swallows model failures and returns an error-shaped
// string ("Error generating summary: ...") instead of throwing. The middleware then
// still emits a RemoveMessage(REMOVE_ALL_MESSAGES) update, wiping the whole thread and
// replacing it with that error text. This is the marker createSummary emits on failure.
const SUMMARY_FAILURE_MARKER = 'Error generating summary:';

type SummarizationOptions = Parameters<typeof summarizationMiddleware>[0];

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => (typeof item === 'string' ? item : typeof item === 'object' && item !== null && 'text' in item ? String((item as { text: unknown }).text) : '')).join('');
  }
  return '';
}

function isFailedSummaryUpdate(update: unknown): boolean {
  if (!update || typeof update !== 'object' || !('messages' in update)) {
    return false;
  }
  const messages = (update as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return false;
  }
  const summaryMessage = messages.find((msg) => msg?.additional_kwargs?.lc_source === 'summarization');
  if (!summaryMessage) {
    return false;
  }
  const text = extractText(summaryMessage.content);
  return text.includes(SUMMARY_FAILURE_MARKER);
}

// Wraps summarizationMiddleware so a failed summary never replaces the conversation.
// When the underlying beforeModel yields an error-shaped summary we drop the update
// (return undefined), leaving the original state intact so the checkpointer keeps the
// real history and the app retries summarization on the next turn.
export function createSafeSummarizationMiddleware(options: SummarizationOptions): AnyAgentMiddleware {
  const inner = summarizationMiddleware(options) as AnyAgentMiddleware & { beforeModel?: (state: unknown, runtime: unknown) => Promise<unknown> };
  const innerBeforeModel = inner.beforeModel;

  if (!innerBeforeModel) {
    return inner;
  }

  return {
    ...inner,
    beforeModel: async (state: unknown, runtime: unknown) => {
      const update = await innerBeforeModel.call(inner, state, runtime);
      if (isFailedSummaryUpdate(update)) {
        logger.error('Summarization failed to produce a valid summary; preserving original conversation history instead of replacing it.');
        return undefined;
      }
      return update;
    },
  } as AnyAgentMiddleware;
}
