import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, fakeModel, type ReactAgent, tool } from 'langchain';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createDanglingToolCallsMiddleware } from './dangling-tool-calls';
import { createStructuredResponseMiddleware, FINAL_REPLY_TOOL_NAME } from './structured-response';

const matchesTool = tool(async () => 'Arsenal 2-1 Chelsea (FT)', { name: 'match_summary', description: 'Get matches', schema: z.object({}) });
const weatherTool = tool(async () => 'sunny', { name: 'weather', description: 'Get weather', schema: z.object({ location: z.string(), date: z.string().optional() }) });
const responseSchema = z.object({ hasMatches: z.boolean() });

// Typed loosely: langchain's inferred invoke() input type collapses to `never` for this middleware.
function createTestAgent(model: ReturnType<typeof fakeModel> | ChatOpenAI, middleware = [createStructuredResponseMiddleware()]): ReactAgent {
  return createAgent({ model, tools: [matchesTool, weatherTool], checkpointer: new MemorySaver(), middleware });
}

// OpenAI rejects a request where an assistant tool call has no matching tool message.
function getUnansweredToolCalls(model: ReturnType<typeof fakeModel>): string[] {
  return model.calls.flatMap(({ messages }) => {
    const answeredIds = new Set(messages.filter(ToolMessage.isInstance).map((m) => m.tool_call_id));
    return messages
      .flatMap((m) => (AIMessage.isInstance(m) ? (m.tool_calls ?? []) : []))
      .filter((call) => !answeredIds.has(call.id))
      .map((call) => call.id);
  });
}

function chatCompletion(message: Record<string, unknown>) {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion',
    created: 0,
    model: 'gpt-4.1-mini',
    choices: [{ index: 0, message: { role: 'assistant', content: null, ...message }, finish_reason: 'stop', logprobs: null }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

describe('createStructuredResponseMiddleware()', () => {
  it('returns the schema from the final agent step and keeps the reply as plain text', async () => {
    const model = fakeModel()
      .respondWithTools([{ name: 'match_summary', args: {} }])
      .respondWithTools([{ name: FINAL_REPLY_TOOL_NAME, args: { message: '⚽ Arsenal beat Chelsea 2-1', data: { hasMatches: true } } }]);
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('football update')] }, { configurable: { thread_id: 't1' }, context: { responseSchema } } as never);

    expect((result as { structuredResponse?: unknown }).structuredResponse).toEqual({ hasMatches: true });
    expect(result.messages.at(-1).text).toEqual('⚽ Arsenal beat Chelsea 2-1');
    expect(result.messages.some((m) => m.getType() === 'tool' && m.name === FINAL_REPLY_TOOL_NAME)).toEqual(false);
    expect(model.calls).toHaveLength(2);
  });

  it('leaves normal turns untouched when no schema is passed', async () => {
    const model = fakeModel().respond(new AIMessage('hi there'));
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('hi')] }, { configurable: { thread_id: 't2' } });

    expect((result as { structuredResponse?: unknown }).structuredResponse).toBeUndefined();
    expect(result.messages.at(-1).text).toEqual('hi there');
  });

  // Regression: a JSON-schema response_format made OpenAI bind every tool as strict, which rejects
  // tools with optional fields ("Invalid schema for function 'weather' ... Missing 'date'").
  it('does not send strict tools or a JSON-schema response_format to OpenAI', async () => {
    const toolCall = { id: 'call_1', type: 'function', function: { name: FINAL_REPLY_TOOL_NAME, arguments: JSON.stringify({ message: 'No matches today', data: { hasMatches: false } }) } };
    const fetch = vi.fn(async () => new Response(JSON.stringify(chatCompletion({ tool_calls: [toolCall] })), { status: 200, headers: { 'content-type': 'application/json' } }));
    const model = new ChatOpenAI({ model: 'gpt-4.1-mini', apiKey: 'test-key', configuration: { fetch } });
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('football update')] }, { configurable: { thread_id: 't3' }, context: { responseSchema } } as never);

    const request = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body as string) as {
      tools: { function: { name: string; strict?: boolean } }[];
      response_format?: unknown;
    };
    expect(request.response_format).toBeUndefined();
    expect(request.tools.map((t) => t.function.name)).toEqual(expect.arrayContaining(['weather', FINAL_REPLY_TOOL_NAME]));
    expect(request.tools.every((t) => t.function.strict !== true)).toEqual(true);
    expect((result as { structuredResponse?: unknown }).structuredResponse).toEqual({ hasMatches: false });
  });

  // Regression: final_reply in parallel with match_summary ended the turn without running match_summary,
  // so the football update had no match cards for the image.
  it('runs regular tools called in parallel with final_reply before finishing', async () => {
    const finalReply = { name: FINAL_REPLY_TOOL_NAME, args: { message: '⚽ Results', data: { hasMatches: true } } };
    const model = fakeModel()
      .respondWithTools([{ name: 'match_summary', args: {} }, finalReply])
      .respondWithTools([finalReply]);
    const agent = createTestAgent(model);

    const result = await agent.invoke({ messages: [new HumanMessage('football update')] }, { configurable: { thread_id: 't4' }, context: { responseSchema } } as never);

    expect((result as { structuredResponse?: unknown }).structuredResponse).toEqual({ hasMatches: true });
    expect(result.messages.some((m) => m.getType() === 'tool' && m.name === 'match_summary')).toEqual(true);
    expect(model.calls).toHaveLength(2);
    expect(getUnansweredToolCalls(model)).toEqual([]);
  });

  // Regression: langchain's structured-output retry answers only the first tool call, so the next
  // request failed with "An assistant message with 'tool_calls' must be followed by tool messages".
  it.each([
    {
      name: 'an invalid final_reply with a regular tool',
      calls: [
        { name: FINAL_REPLY_TOOL_NAME, args: { message: 'x', data: { hasMatches: 'yes' } } },
        { name: 'match_summary', args: {} },
      ],
    },
    {
      name: 'two final_reply calls',
      calls: [
        { name: FINAL_REPLY_TOOL_NAME, args: { message: 'a', data: { hasMatches: true } } },
        { name: FINAL_REPLY_TOOL_NAME, args: { message: 'b', data: { hasMatches: true } } },
      ],
    },
  ])('answers every tool call before retrying after $name', async ({ calls }) => {
    const model = fakeModel()
      .respondWithTools(calls)
      .respondWithTools([{ name: FINAL_REPLY_TOOL_NAME, args: { message: '⚽ Results', data: { hasMatches: true } } }]);
    const agent = createTestAgent(model, [createDanglingToolCallsMiddleware(), createStructuredResponseMiddleware()]);

    const result = await agent.invoke({ messages: [new HumanMessage('football update')] }, { configurable: { thread_id: 't5' }, context: { responseSchema } } as never);

    expect((result as { structuredResponse?: unknown }).structuredResponse).toEqual({ hasMatches: true });
    expect(model.calls).toHaveLength(2);
    expect(getUnansweredToolCalls(model)).toEqual([]);
  });
});
