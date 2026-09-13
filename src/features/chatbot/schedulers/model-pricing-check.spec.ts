import { describe, expect, it } from 'vitest';
import type { ModelPrice } from '@shared/ai';
import { buildDriftMessage, diffPricing, parseStandardPricing } from './model-pricing-check';

const pricingDoc = [
  '# Pricing',
  '',
  '### Standard pricing data',
  '',
  '| Model | Short context input | Short context cached input | Short context cache writes | Short context output | Long context input |',
  '| --- | --- | --- | --- | --- | --- |',
  '| gpt-5 | $1.25 | $0.125 | - | $10.00 | - |',
  '| gpt-5-nano | $0.05 | $0.005 | - | $0.40 | - |',
  '| gpt-5.5 (<272K context length) | $5.00 | $0.50 | - | $30.00 | $10.00 |',
  '| gpt-4o | $2.50 | $1.25 | - | $10.00 | - |',
  '',
  'Some footnote about regional processing.',
  '',
  '### Batch pricing data',
  '',
  '| Model | Short context input | Short context cached input | Short context cache writes | Short context output | Long context input |',
  '| --- | --- | --- | --- | --- | --- |',
  '| gpt-5 | $0.625 | $0.0625 | - | $5.00 | - |',
].join('\n');

const price = (input: number, output: number, cachedInput?: number): ModelPrice => ({ input, output, ...(cachedInput !== undefined ? { cachedInput } : {}) });

describe('parseStandardPricing()', () => {
  it('should parse input and output prices from the standard table', () => {
    expect(parseStandardPricing(pricingDoc)['gpt-5']).toEqual(price(1.25, 10, 0.125));
  });

  it('should ignore the batch table so discounted rates do not overwrite standard ones', () => {
    expect(parseStandardPricing(pricingDoc)['gpt-5'].input).toEqual(1.25);
  });

  it('should strip context-length qualifiers from the model id', () => {
    expect(parseStandardPricing(pricingDoc)['gpt-5.5']).toEqual(price(5, 30, 0.5));
  });

  it('should omit the cached rate when the docs list it as unavailable', () => {
    const doc = ['### Standard pricing data', '', '| Model | in | cached | writes | out | long |', '| --- | --- | --- | --- | --- | --- |', '| some-model | $1.00 | - | - | $2.00 | - |'].join('\n');
    expect(parseStandardPricing(doc)['some-model']).toEqual(price(1, 2));
  });

  it('should skip the header and separator rows', () => {
    expect(Object.keys(parseStandardPricing(pricingDoc))).toEqual(['gpt-5', 'gpt-5-nano', 'gpt-5.5', 'gpt-4o']);
  });

  it('should throw when the standard table heading is missing', () => {
    expect(() => parseStandardPricing('# Pricing\n\nno tables here')).toThrow(/Could not find/);
  });

  it('should throw when the table exists but has no parseable rows', () => {
    expect(() => parseStandardPricing('### Standard pricing data\n\n| Model | a | b | c | d | e |\n| --- | --- | --- | --- | --- | --- |\n')).toThrow(/no model rows/);
  });
});

describe('diffPricing()', () => {
  const live = { 'gpt-5': price(1.25, 10), 'gpt-4o': price(2.5, 10) };

  it('should return no drift when prices match', () => {
    expect(diffPricing({ 'gpt-5': price(1.25, 10) }, live)).toEqual([]);
  });

  it('should report drift when the input price changed', () => {
    expect(diffPricing({ 'gpt-5': price(1.0, 10) }, live)).toEqual([{ model: 'gpt-5', local: price(1.0, 10), live: price(1.25, 10) }]);
  });

  it('should report drift when the output price changed', () => {
    expect(diffPricing({ 'gpt-5': price(1.25, 8) }, live)).toEqual([{ model: 'gpt-5', local: price(1.25, 8), live: price(1.25, 10) }]);
  });

  it('should report a null live price when the model is no longer listed', () => {
    expect(diffPricing({ 'gpt-4.1-mini': price(0.4, 1.6) }, live)).toEqual([{ model: 'gpt-4.1-mini', local: price(0.4, 1.6), live: null }]);
  });

  it('should not report models listed in the docs but absent locally', () => {
    expect(diffPricing({ 'gpt-5': price(1.25, 10) }, { ...live, 'gpt-5-pro': price(15, 120) })).toEqual([]);
  });

  it('should report drift when a tracked cached input price changed', () => {
    const withCache = { 'gpt-5': price(1.25, 10, 0.125) };
    expect(diffPricing(withCache, { 'gpt-5': price(1.25, 10, 0.2) })).toHaveLength(1);
  });

  it('should not report drift when the cached price is untracked locally', () => {
    expect(diffPricing({ 'gpt-5': price(1.25, 10) }, { 'gpt-5': price(1.25, 10, 0.125) })).toEqual([]);
  });
});

describe('buildDriftMessage()', () => {
  it('should return null when there is no drift', () => {
    expect(buildDriftMessage([])).toEqual(null);
  });

  it('should include the old and new prices for a changed model', () => {
    const message = buildDriftMessage([{ model: 'gpt-5', local: price(1.0, 10), live: price(1.25, 12) }]);
    expect(message).toContain('in: $1 → $1.25');
    expect(message).toContain('out: $10 → $12');
  });

  it('should call out a model that disappeared from the docs', () => {
    expect(buildDriftMessage([{ model: 'gpt-4o', local: price(2.5, 10), live: null }])).toContain('no longer listed');
  });

  it('should include the cached rate line only when it drifted', () => {
    const drifted = buildDriftMessage([{ model: 'gpt-5', local: price(1.25, 10, 0.125), live: price(1.25, 10, 0.3) }]);
    expect(drifted).toContain('cached in: $0.125 → $0.3');

    const inputOnly = buildDriftMessage([{ model: 'gpt-5', local: price(1.0, 10, 0.125), live: price(1.25, 10, 0.125) }]);
    expect(inputOnly).not.toContain('cached in');
  });

  it('should pluralize the model count', () => {
    const drifts = [
      { model: 'gpt-5', local: price(1, 10), live: price(2, 10) },
      { model: 'gpt-4o', local: price(2.5, 10), live: price(3, 10) },
    ];
    expect(buildDriftMessage(drifts)).toContain('(2 models)');
    expect(buildDriftMessage(drifts.slice(0, 1))).toContain('(1 model)');
  });
});
