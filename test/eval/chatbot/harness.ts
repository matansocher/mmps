import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { agent, createAgentService } from '@features/chatbot/agent';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { UsageCallbackHandler } from '@shared/ai';
import type { CapturedCall, RunResult } from './types';

// Prod-parity model. Temperature matches ChatbotService.
const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });

// The real chatbot descriptor — we reuse its exact system prompt and the real tool set,
// but swap every tool body for a spy that records the call and returns a stub. This tests
// routing (which tool + args the prompt makes the model choose) without any side effects.
const descriptor = agent();

function buildSpyAgent() {
  const calls: CapturedCall[] = [];
  const spyTools = descriptor.tools.map((realTool) => {
    const anyTool = realTool as unknown as { name: string; description: string; schema: any };
    return tool(
      async (args: Record<string, unknown>) => {
        calls.push({ name: anyTool.name, args });
        return JSON.stringify({ ok: true, stub: true });
      },
      { name: anyTool.name, description: anyTool.description, schema: anyTool.schema },
    );
  });

  const service = createAgentService({ name: 'CHATBOT-EVAL', prompt: descriptor.prompt, tools: spyTools as any }, { model });
  return { service, calls };
}

const EMPTY_USAGE = { tokensIn: 0, tokensOut: 0, tokensTotal: 0, cost: 0, llmCalls: 0, toolCalls: 0 };

// Run one user message through a fresh, isolated spy agent and capture the tool calls + usage.
export async function runOnce(input: string): Promise<RunResult> {
  const { service, calls } = buildSpyAgent();
  const usage = new UsageCallbackHandler();
  const threadId = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = Date.now();

  try {
    await service.invoke(input, { threadId, callbacks: [usage] });
  } catch (err) {
    return { calls, ...EMPTY_USAGE, durationMs: Date.now() - startedAt, error: err instanceof Error ? err.message : String(err) };
  }

  const summary = usage.summary();
  return {
    calls,
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
