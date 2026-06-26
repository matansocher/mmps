import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { computeModelCost } from './model-pricing';

export type UsageSummary = {
  readonly model: string; // single model name, or comma-joined if a turn used several
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly tokensTotal: number;
  readonly cost: number; // USD
  readonly llmCalls: number;
  readonly toolCalls: number;
};

type ModelTokenTotals = { inputTokens: number; outputTokens: number };

// Per-turn usage accumulator. Create one instance per user turn and pass it as a runtime
// callback to `invoke`. It sums token usage across every internal LLM call (the ReAct loop
// plus the occasional summarization call) and counts tool invocations, then exposes a
// single `summary()` with the per-model cost rolled up.
export class UsageCallbackHandler extends BaseCallbackHandler {
  name = 'UsageCallbackHandler';
  private readonly perModel = new Map<string, ModelTokenTotals>();
  private llmCalls = 0;
  private toolCalls = 0;

  async handleLLMEnd(output: LLMResult): Promise<void> {
    this.llmCalls += 1;
    const model = this.extractModel(output) ?? 'unknown';
    const { inputTokens, outputTokens } = this.extractTokens(output);
    const current = this.perModel.get(model) ?? { inputTokens: 0, outputTokens: 0 };
    current.inputTokens += inputTokens;
    current.outputTokens += outputTokens;
    this.perModel.set(model, current);
  }

  async handleToolStart(): Promise<void> {
    this.toolCalls += 1;
  }

  summary(): UsageSummary {
    let tokensIn = 0;
    let tokensOut = 0;
    let cost = 0;
    for (const [model, tokens] of this.perModel) {
      tokensIn += tokens.inputTokens;
      tokensOut += tokens.outputTokens;
      cost += computeModelCost(model, tokens);
    }
    const models = [...this.perModel.keys()];
    return {
      model: models.join(',') || 'unknown',
      tokensIn,
      tokensOut,
      tokensTotal: tokensIn + tokensOut,
      cost,
      llmCalls: this.llmCalls,
      toolCalls: this.toolCalls,
    };
  }

  private extractTokens(output: LLMResult): ModelTokenTotals {
    let inputTokens = 0;
    let outputTokens = 0;
    for (const generations of output.generations) {
      for (const generation of generations) {
        const usage = (generation as { message?: { usage_metadata?: { input_tokens?: number; output_tokens?: number } } }).message?.usage_metadata;
        if (usage) {
          inputTokens += usage.input_tokens ?? 0;
          outputTokens += usage.output_tokens ?? 0;
        }
      }
    }
    return { inputTokens, outputTokens };
  }

  private extractModel(output: LLMResult): string | undefined {
    if (typeof output.llmOutput?.model_name === 'string') return output.llmOutput.model_name;
    for (const generations of output.generations) {
      for (const generation of generations) {
        const meta = (generation as { message?: { response_metadata?: { model_name?: string; model?: string } } }).message?.response_metadata;
        if (meta?.model_name) return meta.model_name;
        if (meta?.model) return meta.model;
      }
    }
    return undefined;
  }
}
