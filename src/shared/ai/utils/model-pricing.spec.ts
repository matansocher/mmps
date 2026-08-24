import { describe, expect, it } from 'vitest';
import { computeModelCost, MODEL_PRICING } from './model-pricing';

describe('computeModelCost()', () => {
  it('should bill input and output tokens at their own rates', () => {
    // gpt-4.1-mini: $0.40 / 1M in, $1.60 / 1M out
    expect(computeModelCost('gpt-4.1-mini', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(2.0, 10);
  });

  it('should scale linearly with token counts', () => {
    expect(computeModelCost('gpt-4o', { inputTokens: 1000, outputTokens: 500 })).toBeCloseTo((1000 * 2.5 + 500 * 10) / 1_000_000, 12);
  });

  it('should return 0 for zero tokens', () => {
    expect(computeModelCost('gpt-4o', { inputTokens: 0, outputTokens: 0 })).toEqual(0);
  });

  it('should return 0 and not throw for an unknown model', () => {
    expect(computeModelCost('some-unreleased-model', { inputTokens: 1000, outputTokens: 1000 })).toEqual(0);
  });

  describe('cached input tokens', () => {
    it('should bill cache hits at the cheaper cached rate', () => {
      // gpt-4.1-mini cached in is $0.10 / 1M vs $0.40 full price.
      expect(computeModelCost('gpt-4.1-mini', { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 1_000_000 })).toBeCloseTo(0.1, 10);
    });

    it('should treat cached tokens as a subset of input tokens, not an addition', () => {
      const half = computeModelCost('gpt-4.1-mini', { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 500_000 });
      // 500k at $0.40/1M + 500k at $0.10/1M = $0.20 + $0.05
      expect(half).toBeCloseTo(0.25, 10);
    });

    it('should never cost more than the all-full-price equivalent', () => {
      const cached = computeModelCost('gpt-4o', { inputTokens: 10_000, outputTokens: 1000, cachedInputTokens: 8000 });
      const uncached = computeModelCost('gpt-4o', { inputTokens: 10_000, outputTokens: 1000 });
      expect(cached).toBeLessThan(uncached);
    });

    it('should ignore a cached count larger than the input count', () => {
      const bogus = computeModelCost('gpt-4.1-mini', { inputTokens: 1000, outputTokens: 0, cachedInputTokens: 999_999 });
      const clamped = computeModelCost('gpt-4.1-mini', { inputTokens: 1000, outputTokens: 0, cachedInputTokens: 1000 });
      expect(bogus).toEqual(clamped);
    });

    it('should ignore a negative cached count', () => {
      const negative = computeModelCost('gpt-4.1-mini', { inputTokens: 1000, outputTokens: 0, cachedInputTokens: -50 });
      expect(negative).toEqual(computeModelCost('gpt-4.1-mini', { inputTokens: 1000, outputTokens: 0 }));
    });

    it('should fall back to the full input rate when no cached price is configured', () => {
      const model = 'test-no-cached-price';
      MODEL_PRICING[model] = { input: 1.0, output: 2.0 };
      try {
        expect(computeModelCost(model, { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 1_000_000 })).toBeCloseTo(1.0, 10);
      } finally {
        delete MODEL_PRICING[model];
      }
    });
  });

  describe('model resolution', () => {
    it('should resolve a dated snapshot to its base model price', () => {
      expect(computeModelCost('gpt-4.1-mini-2025-04-14', { inputTokens: 1_000_000, outputTokens: 0 })).toEqual(computeModelCost('gpt-4.1-mini', { inputTokens: 1_000_000, outputTokens: 0 }));
    });

    it('should NOT resolve a sibling model to a shorter prefix', () => {
      // gpt-5-mini is $0.25/1M in — it must not inherit gpt-5's $1.25/1M.
      expect(computeModelCost('gpt-5-mini', { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(0.25, 10);
    });

    it('should price each listed sibling independently', () => {
      const inputRate = (model: string) => computeModelCost(model, { inputTokens: 1_000_000, outputTokens: 0 });
      expect(inputRate('gpt-5')).toBeCloseTo(1.25, 10);
      expect(inputRate('gpt-5-mini')).toBeCloseTo(0.25, 10);
      expect(inputRate('gpt-5-nano')).toBeCloseTo(0.05, 10);
      expect(inputRate('gpt-4o')).toBeCloseTo(2.5, 10);
      expect(inputRate('gpt-4o-mini')).toBeCloseTo(0.15, 10);
      expect(inputRate('gpt-4.1')).toBeCloseTo(2.0, 10);
      expect(inputRate('gpt-4.1-mini')).toBeCloseTo(0.4, 10);
      expect(inputRate('gpt-4.1-nano')).toBeCloseTo(0.1, 10);
    });

    it('should report 0 for an unlisted sibling rather than guessing a wrong price', () => {
      // gpt-5-pro is real but unlisted; silently billing it at gpt-5 rates would understate cost 12x.
      expect(computeModelCost('gpt-5-pro', { inputTokens: 1_000_000, outputTokens: 0 })).toEqual(0);
    });
  });

  describe('MODEL_PRICING table', () => {
    it('should have a cached input rate no higher than the full input rate', () => {
      for (const [model, price] of Object.entries(MODEL_PRICING)) {
        if (price.cachedInput !== undefined) {
          expect(price.cachedInput, `${model} cachedInput`).toBeLessThanOrEqual(price.input);
        }
      }
    });

    it('should have positive input and output rates for every model', () => {
      for (const [model, price] of Object.entries(MODEL_PRICING)) {
        expect(price.input, `${model} input`).toBeGreaterThan(0);
        expect(price.output, `${model} output`).toBeGreaterThan(0);
      }
    });
  });
});
