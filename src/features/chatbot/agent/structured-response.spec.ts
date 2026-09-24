import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, fakeModel, tool } from 'langchain';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createStructuredResponseMiddleware } from './structured-response';

const matchesTool = tool(async () => 'Arsenal 2-1 Chelsea (FT)', { name: 'match_summary', description: 'Get matches', schema: z.object({}) });
const responseSchema = z.object({ hasMatches: z.boolean() });

function createTestAgent(model: ReturnType<typeof fakeModel>) {
  return createAgent({ model, tools: [matchesTool], checkpointer: new MemorySaver(), middleware: [createStructuredResponseMiddleware()] });
}

describe('createStructuredResponseMiddleware()', () => {
  it('returns the schema from the final agent step and keeps the reply as plain text', async () => {
    const model = fakeModel()
      .respondWithTools([{ name: 'match_summary', args: {} }])
      .respond(new AIMessage(JSON.stringify({ message: '⚽ Arsenal beat Chelsea 2-1', data: { hasMatches: true } })));
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('football update')] }, { configurable: { thread_id: 't1' }, context: { responseSchema } } as never);

    expect((result as { structuredResponse?: unknown }).structuredResponse).toEqual({ hasMatches: true });
    expect(result.messages.at(-1).text).toEqual('⚽ Arsenal beat Chelsea 2-1');
    expect(model.calls).toHaveLength(2);
  });

  it('leaves normal turns untouched when no schema is passed', async () => {
    const model = fakeModel().respond(new AIMessage('hi there'));
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('hi')] }, { configurable: { thread_id: 't2' } });

    expect((result as { structuredResponse?: unknown }).structuredResponse).toBeUndefined();
    expect(result.messages.at(-1).text).toEqual('hi there');
  });
});
