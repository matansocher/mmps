import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, createMiddleware, fakeModel, tool } from 'langchain';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createToolSelectionMiddleware } from './tool-selection';

function makeTool(name: string) {
  return tool(async () => `${name} result`, { name, description: `${name} tool`, schema: z.object({}) });
}

const tools = [makeTool('weather'), makeTool('gmail'), makeTool('reminders'), makeTool('web_search')];

function createSelector(result: { tools: string[] } | Error) {
  const invoke = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const model = { withStructuredOutput: () => ({ invoke }) } as unknown as BaseChatModel;
  return { model, invoke };
}

function createTestAgent(mainModel: ReturnType<typeof fakeModel>, selectorModel: BaseChatModel) {
  const seenTools: string[][] = [];
  const recorder = createMiddleware({
    name: 'Recorder',
    wrapModelCall: async (request, handler) => {
      seenTools.push(request.tools.map((t) => (t as { name: string }).name));
      return handler(request);
    },
  });
  const agent = createAgent({
    model: mainModel,
    tools,
    checkpointer: new MemorySaver(),
    middleware: [createToolSelectionMiddleware({ model: selectorModel, alwaysInclude: ['web_search'] }), recorder],
  });
  return { agent, seenTools };
}

describe('createToolSelectionMiddleware()', () => {
  it('sends only the selected tools plus always-included ones, selecting once per turn', async () => {
    const selector = createSelector({ tools: ['weather'] });
    const mainModel = fakeModel()
      .respondWithTools([{ name: 'weather', args: {} }])
      .respond(new AIMessage('Sunny'));
    const { agent, seenTools } = createTestAgent(mainModel, selector.model);

    await agent.invoke({ messages: [new HumanMessage('weather?')] }, { configurable: { thread_id: 't1' } });

    expect(seenTools).toEqual([
      ['weather', 'web_search'],
      ['weather', 'web_search'],
    ]);
    expect(selector.invoke).toHaveBeenCalledTimes(1);
  });

  it('selects again for the next user message', async () => {
    const selector = createSelector({ tools: ['gmail'] });
    const mainModel = fakeModel().respond(new AIMessage('one')).respond(new AIMessage('two'));
    const { agent } = createTestAgent(mainModel, selector.model);
    const config = { configurable: { thread_id: 't2' } };

    await agent.invoke({ messages: [new HumanMessage('first')] }, config);
    await agent.invoke({ messages: [new HumanMessage('second')] }, config);

    expect(selector.invoke).toHaveBeenCalledTimes(2);
  });

  it('falls back to all tools when selection fails', async () => {
    const selector = createSelector(new Error('boom'));
    const mainModel = fakeModel().respond(new AIMessage('hi'));
    const { agent, seenTools } = createTestAgent(mainModel, selector.model);

    const result = await agent.invoke({ messages: [new HumanMessage('hi')] }, { configurable: { thread_id: 't3' } });

    expect(seenTools).toEqual([['weather', 'gmail', 'reminders', 'web_search']]);
    expect(result.messages.at(-1).text).toEqual('hi');
  });
});
