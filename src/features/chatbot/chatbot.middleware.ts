import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { type AnyAgentMiddleware, modelCallLimitMiddleware, toolCallLimitMiddleware } from 'langchain';
import { createSafeSummarizationMiddleware, createToolRetryMiddleware } from './agent';
import { CHATBOT_CONFIG, CHATBOT_SUMMARY_PROMPT } from './chatbot.config';

// The production middleware stack. Shared by ChatbotService and the routing eval
// (test/eval/chatbot) so the eval measures the agent exactly as it runs in prod.
export function createChatbotMiddleware(model: ChatAnthropic | ChatOpenAI): AnyAgentMiddleware[] {
  // Compresses older turns into a running summary once the thread grows past the trigger,
  // keeping recent messages verbatim. Replaces the old drop-oldest truncation, and the
  // summarized state is persisted by the checkpointer (item #1) instead of being deleted.
  //
  // Bounded by tokens, not message counts: a single retained message can carry a base64 image
  // or a full transcript, so a message-only limit doesn't bound the context window or the size
  // of the MongoDB checkpoint document (16 MiB limit). The trigger array is OR'd — summarize
  // when the history exceeds the token budget OR the message-count fallback — and `keep` is
  // token-based so the retained tail fits a real budget.
  //
  // Wrapped in a safe guard: if the underlying summarizer fails, the original history is
  // preserved rather than replaced with an error-shaped summary.
  const summarization = createSafeSummarizationMiddleware({
    model,
    trigger: [{ tokens: CHATBOT_CONFIG.summarization.triggerTokens }, { messages: CHATBOT_CONFIG.summarization.triggerMessages }],
    keep: { tokens: CHATBOT_CONFIG.summarization.keepTokens },
    summaryPrompt: CHATBOT_SUMMARY_PROMPT,
  });

  // Bounded turn: cap model requests and tool calls per run so a request timeout (which only
  // covers one model call) and recursionLimit (which only bounds graph steps) are not the sole
  // ceilings. Model limit ends the run gracefully; tool limit blocks further tool calls but lets
  // the model still produce an answer.
  const modelCallLimit = modelCallLimitMiddleware({ runLimit: CHATBOT_CONFIG.execution.modelCallLimitPerRun, exitBehavior: 'end' });
  const toolCallLimit = toolCallLimitMiddleware({ runLimit: CHATBOT_CONFIG.execution.toolCallLimitPerRun, exitBehavior: 'continue' });

  // Retries read-only tool calls (weather, search, list actions, ...) on timeouts, 429 and 5xx,
  // and returns clear errors the model can act on. Calls with side effects are never retried.
  const toolRetry = createToolRetryMiddleware();

  return [summarization, modelCallLimit, toolCallLimit, toolRetry];
}
