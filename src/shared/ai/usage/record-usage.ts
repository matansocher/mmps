import { Logger } from '@core/utils';
import type { UsageCallbackHandler } from '../utils';
import { saveUsageRecord } from './usage.repository';

const logger = new Logger('ai-usage');

export type RecordUsageParams = {
  readonly source: string;
  readonly chatId?: number;
  readonly handler: UsageCallbackHandler;
  readonly durationMs: number;
};

// Logs a structured usage line and fire-and-forget persists the turn's usage. Shared by every
// LangChain chat call site (chatbot, chilli, secretary, ...) so all AI spend lands in one store.
export function recordModelUsage({ source, chatId, handler, durationMs }: RecordUsageParams): void {
  const usage = handler.summary();
  if (usage.llmCalls === 0) {
    return;
  }

  logger.log(
    `💰 usage source=${source}${chatId !== undefined ? ` chatId=${chatId}` : ''} model=${usage.model} in=${usage.tokensIn} out=${usage.tokensOut} total=${usage.tokensTotal} cost=$${usage.cost.toFixed(6)} llmCalls=${usage.llmCalls} toolCalls=${usage.toolCalls} duration=${durationMs}ms`,
  );

  saveUsageRecord({
    source,
    ...(chatId !== undefined ? { chatId } : {}),
    model: usage.model,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    tokensTotal: usage.tokensTotal,
    cost: usage.cost,
    durationMs,
    llmCalls: usage.llmCalls,
    toolCalls: usage.toolCalls,
  }).catch((err) => logger.error(`Failed to persist usage record (source=${source}): ${err}`));
}
