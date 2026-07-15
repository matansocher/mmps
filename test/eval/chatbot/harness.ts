import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { agent, createAgentService } from '@features/chatbot/agent';
import { formatAgentResponse } from '@features/chatbot/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { UsageCallbackHandler } from '@shared/ai';
import type { CapturedCall, EvalCase, RunResult, ToolFixture } from './types';

// Prod-parity model. Temperature matches ChatbotService.
const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });

// The real chatbot descriptor — we reuse its exact system prompt and the real tool set,
// but swap every tool body for a spy that records the call and returns a stub. This tests
// routing (which tool + args the prompt makes the model choose) without any side effects.
const descriptor = agent();

async function resolveFixture(fixture: ToolFixture | undefined, args: Record<string, unknown>): Promise<unknown> {
  if (typeof fixture === 'function') {
    return await fixture(args);
  }
  return fixture ?? { ok: true, stub: true };
}

function buildSpyAgent(evalCase: EvalCase) {
  const calls: CapturedCall[] = [];
  const spyTools = descriptor.tools.map((realTool) => {
    return tool(
      async (args: Record<string, unknown>) => {
        calls.push({ name: realTool.name, args });
        const result = await resolveFixture(evalCase.fixtures?.[realTool.name], args);
        return typeof result === 'string' ? result : JSON.stringify(result);
      },
      { name: realTool.name, description: realTool.description, schema: realTool.schema },
    );
  });

  const service = createAgentService({ name: 'CHATBOT-EVAL', prompt: descriptor.prompt, tools: spyTools }, { model });
  return { service, calls };
}

// Run one case through a fresh, isolated spy agent and capture tool calls, final response, and usage.
export async function runOnce(evalCase: EvalCase): Promise<RunResult> {
  const { service, calls } = buildSpyAgent(evalCase);
  const usage = new UsageCallbackHandler();
  const threadId = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = Date.now();
  const inputs = Array.isArray(evalCase.input) ? evalCase.input : [evalCase.input];
  let response = '';

  try {
    for (const input of inputs) {
      const result = await service.invoke(input, { threadId, callbacks: [usage] });
      response = formatAgentResponse(result).message;
    }
  } catch (err) {
    const summary = usage.summary();
    return {
      calls,
      response,
      tokensIn: summary.tokensIn,
      tokensOut: summary.tokensOut,
      tokensTotal: summary.tokensTotal,
      cost: summary.cost,
      llmCalls: summary.llmCalls,
      toolCalls: summary.toolCalls,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const summary = usage.summary();
  return {
    calls,
    response,
    tokensIn: summary.tokensIn,
    tokensOut: summary.tokensOut,
    tokensTotal: summary.tokensTotal,
    cost: summary.cost,
    llmCalls: summary.llmCalls,
    toolCalls: summary.toolCalls,
    durationMs: Date.now() - startedAt,
  };
}

// Minimal fixed-concurrency worker pool (no external dependency).
export async function runPool<T, R>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) {
        break;
      }
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}
