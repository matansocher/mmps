import { Logger } from '@core/utils';

const logger = new Logger('model-pricing');

const PER_MILLION = 1_000_000;

type ModelPrice = {
  readonly input: number; // USD per 1M input tokens
  readonly output: number; // USD per 1M output tokens
};

// USD per 1,000,000 tokens. Source: OpenAI API pricing (developers.openai.com), captured 2026-06.
// Prices drift — verify against https://platform.openai.com/docs/pricing when they look off.
// Only models that actually flow through our agents are listed; unknown models report cost 0.
export const MODEL_PRICING: Record<string, ModelPrice> = {
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-5': { input: 1.25, output: 10.0 },
  'gpt-5-nano': { input: 0.05, output: 0.4 },
};

export type ModelTokens = {
  readonly inputTokens: number;
  readonly outputTokens: number;
};

// Cost in USD for a single model's token counts. Input tokens are billed at full price
// (no cache discount) — a small, safe over-estimate. Unknown model → 0 + warn.
export function computeModelCost(model: string, tokens: ModelTokens): number {
  const price = MODEL_PRICING[model];
  if (!price) {
    logger.warn(`No price configured for model "${model}"; reporting cost 0`);
    return 0;
  }
  return (tokens.inputTokens * price.input + tokens.outputTokens * price.output) / PER_MILLION;
}
