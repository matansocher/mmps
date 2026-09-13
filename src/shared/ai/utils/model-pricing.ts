import { Logger } from '@core/utils';

const logger = new Logger('ai:model-pricing');

const PER_MILLION = 1_000_000;

export type ModelPrice = {
  readonly input: number; // USD per 1M input tokens
  readonly output: number; // USD per 1M output tokens
  readonly cachedInput?: number; // USD per 1M cached input tokens (cache hits are billed cheaper)
};

// USD per 1,000,000 tokens. Source: OpenAI API pricing (developers.openai.com), captured 2026-08.
// Prices drift — verify against https://developers.openai.com/api/docs/pricing when they look off.
// The monthly `modelPricingCheck` scheduler diffs this table against those docs and DMs on drift.
// Sibling models must each be listed explicitly: prefix matching only resolves dated snapshots
// (e.g. "gpt-4o-2024-08-06"), never a different model that happens to share a prefix.
export const MODEL_PRICING: Record<string, ModelPrice> = {
  'gpt-4.1': { input: 2.0, output: 8.0, cachedInput: 0.5 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6, cachedInput: 0.1 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4, cachedInput: 0.025 },
  'gpt-4o': { input: 2.5, output: 10.0, cachedInput: 1.25 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, cachedInput: 0.075 },
  'gpt-5': { input: 1.25, output: 10.0, cachedInput: 0.125 },
  'gpt-5-mini': { input: 0.25, output: 2.0, cachedInput: 0.025 },
  'gpt-5-nano': { input: 0.05, output: 0.4, cachedInput: 0.005 },
};

export type ModelTokens = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens?: number; // subset of inputTokens that hit the prompt cache
};

// Cost in USD for a single model's token counts. Cached input tokens are billed at the cheaper
// cache-hit rate and are a *subset* of inputTokens, so they're deducted from the full-price
// portion rather than added on top. Unknown model → 0 + warn.
export function computeModelCost(model: string, tokens: ModelTokens): number {
  const price = resolveModelPrice(model);
  if (!price) {
    logger.warn(`No price configured for model "${model}"; reporting cost 0`);
    return 0;
  }

  // Guard against a provider reporting more cached tokens than input tokens.
  const cachedTokens = Math.min(Math.max(tokens.cachedInputTokens ?? 0, 0), tokens.inputTokens);
  const uncachedTokens = tokens.inputTokens - cachedTokens;
  const cachedRate = price.cachedInput ?? price.input;

  return (uncachedTokens * price.input + cachedTokens * cachedRate + tokens.outputTokens * price.output) / PER_MILLION;
}

// Resolves dated model snapshots (e.g. "gpt-4.1-mini-2025-04-14") to their base price. Only a
// date suffix is treated as the same model — a bare name suffix like "gpt-5-mini" is a genuinely
// different model with different pricing, so it must have its own entry rather than silently
// inheriting "gpt-5" rates.
function resolveModelPrice(model: string): ModelPrice | undefined {
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  const snapshotMatch = model.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
  return snapshotMatch ? MODEL_PRICING[snapshotMatch[1]] : undefined;
}
