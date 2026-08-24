import { describe, expect, it } from 'vitest';
import { UsageCallbackHandler } from './usage-callback-handler';

type FakeUsage = { input_tokens?: number; output_tokens?: number; input_token_details?: { cache_read?: number } };

function llmEnd(model: string, usage: FakeUsage) {
  return { generations: [[{ text: '', message: { usage_metadata: usage, response_metadata: { model_name: model } } }]] } as never;
}

describe('UsageCallbackHandler', () => {
  it('should report zeroed usage before any calls', () => {
    expect(new UsageCallbackHandler().summary()).toEqual({ model: 'unknown', tokensIn: 0, tokensOut: 0, tokensTotal: 0, tokensCached: 0, cost: 0, llmCalls: 0, toolCalls: 0 });
  });

  it('should sum tokens across multiple LLM calls in a turn', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 100, output_tokens: 20 }));
    await handler.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 300, output_tokens: 50 }));

    const summary = handler.summary();
    expect(summary.tokensIn).toEqual(400);
    expect(summary.tokensOut).toEqual(70);
    expect(summary.tokensTotal).toEqual(470);
    expect(summary.llmCalls).toEqual(2);
  });

  it('should count tool calls', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleToolStart();
    await handler.handleToolStart();
    expect(handler.summary().toolCalls).toEqual(2);
  });

  it('should accumulate cached input tokens', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 1000, output_tokens: 10, input_token_details: { cache_read: 800 } }));
    await handler.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 1000, output_tokens: 10, input_token_details: { cache_read: 200 } }));

    const summary = handler.summary();
    expect(summary.tokensIn).toEqual(2000);
    expect(summary.tokensCached).toEqual(1000);
  });

  it('should charge less when part of the input was cached', async () => {
    const cached = new UsageCallbackHandler();
    await cached.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 10_000, output_tokens: 100, input_token_details: { cache_read: 9000 } }));

    const uncached = new UsageCallbackHandler();
    await uncached.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 10_000, output_tokens: 100 }));

    expect(cached.summary().cost).toBeLessThan(uncached.summary().cost);
  });

  it('should price each model separately when a turn spans models', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleLLMEnd(llmEnd('gpt-4.1-mini', { input_tokens: 1_000_000, output_tokens: 0 }));
    await handler.handleLLMEnd(llmEnd('gpt-4o', { input_tokens: 1_000_000, output_tokens: 0 }));

    const summary = handler.summary();
    expect(summary.model).toEqual('gpt-4.1-mini,gpt-4o');
    // $0.40 (gpt-4.1-mini) + $2.50 (gpt-4o)
    expect(summary.cost).toBeCloseTo(2.9, 10);
  });

  it('should treat a turn with no usage metadata as zero cost but still count the call', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleLLMEnd({ generations: [[{ text: '' }]] } as never);

    const summary = handler.summary();
    expect(summary.llmCalls).toEqual(1);
    expect(summary.tokensTotal).toEqual(0);
    expect(summary.cost).toEqual(0);
  });

  it('should fall back to the unknown model bucket when the model cannot be determined', async () => {
    const handler = new UsageCallbackHandler();
    await handler.handleLLMEnd({ generations: [[{ text: '', message: { usage_metadata: { input_tokens: 10, output_tokens: 5 } } }]] } as never);

    const summary = handler.summary();
    expect(summary.model).toEqual('unknown');
    expect(summary.tokensTotal).toEqual(15);
    expect(summary.cost).toEqual(0);
  });
});
