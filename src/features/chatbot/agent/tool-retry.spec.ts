import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, fakeModel, type ReactAgent, tool } from 'langchain';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createToolRetryMiddleware, isReadOnlyToolCall, isTransientToolError } from './tool-retry';

function errorWith(fields: Record<string, unknown>, message = 'boom'): Error {
  return Object.assign(new Error(message), fields);
}

function failingTool(name: string, failures: Error[]) {
  const calls: unknown[] = [];
  const instance = tool(
    async (args) => {
      calls.push(args);
      const failure = failures.shift();
      if (failure) {
        throw failure;
      }
      return 'ok';
    },
    { name, description: name, schema: z.object({ action: z.string().optional() }) },
  );
  return { instance, calls };
}

async function runAgent(toolInstance: ReturnType<typeof failingTool>['instance'], args: Record<string, unknown>) {
  const model = fakeModel()
    .respondWithTools([{ name: toolInstance.name, args }])
    .respond(new AIMessage('done'));
  // Typed loosely: langchain's inferred invoke() input type collapses to `never` for this middleware.
  const agent: ReactAgent = createAgent({ model, tools: [toolInstance], checkpointer: new MemorySaver(), middleware: [createToolRetryMiddleware({ initialDelayMs: 0 })] });
  const result = await agent.invoke({ messages: [new HumanMessage('go')] }, { configurable: { thread_id: `t-${Math.random()}` } });
  return result.messages.find((message) => ToolMessage.isInstance(message)) as ToolMessage;
}

describe('createToolRetryMiddleware()', () => {
  it('should retry a read-only tool call after a transient error', async () => {
    const weather = failingTool('weather', [errorWith({ code: 'ECONNRESET' })]);

    const toolMessage = await runAgent(weather.instance, {});

    expect(weather.calls).toHaveLength(2);
    expect(toolMessage.content).toEqual('ok');
  });

  it('should give up after maxRetries and tell the model the service is unavailable', async () => {
    const weather = failingTool('weather', [errorWith({ status: 503 }), errorWith({ status: 503 }), errorWith({ status: 503 })]);

    const toolMessage = await runAgent(weather.instance, {});

    expect(weather.calls).toHaveLength(3);
    expect(toolMessage.status).toEqual('error');
    expect(toolMessage.content).toContain('temporarily unavailable (failed 3 times)');
  });

  it('should not retry an action with side effects', async () => {
    const gmail = failingTool('gmail', [errorWith({ code: 'ETIMEDOUT' })]);

    const toolMessage = await runAgent(gmail.instance, { action: 'send' });

    expect(gmail.calls).toHaveLength(1);
    expect(toolMessage.content).toContain('Do not repeat it');
  });

  it('should not retry a non-transient error and keep the default error text', async () => {
    const weather = failingTool('weather', [new Error('City not found')]);

    const toolMessage = await runAgent(weather.instance, {});

    expect(weather.calls).toHaveLength(1);
    expect(toolMessage.content).toEqual('Error: City not found\n Please fix your mistakes.');
  });
});

describe('isTransientToolError()', () => {
  test.each([
    { name: 'timeout', error: Object.assign(new Error('t'), { name: 'TimeoutError' }), expected: true },
    { name: 'connection reset', error: errorWith({ code: 'ECONNRESET' }), expected: true },
    { name: 'status 503', error: errorWith({ status: 503 }), expected: true },
    { name: 'axios 429', error: errorWith({ response: { status: 429 } }), expected: true },
    { name: 'fetch failed with socket cause', error: new TypeError('fetch failed', { cause: errorWith({ code: 'UND_ERR_SOCKET' }) }), expected: true },
    { name: 'status 404', error: errorWith({ status: 404 }), expected: false },
    { name: 'status 501', error: errorWith({ status: 501 }), expected: false },
    { name: 'abort', error: Object.assign(new Error('a'), { name: 'AbortError' }), expected: false },
    { name: 'plain error', error: new Error('bad input'), expected: false },
    { name: 'non-error value', error: 'boom', expected: false },
  ])('should return $expected for $name', ({ error, expected }) => {
    expect(isTransientToolError(error)).toEqual(expected);
  });
});

describe('isReadOnlyToolCall()', () => {
  test.each([
    { name: 'weather', args: {}, expected: true },
    { name: 'gmail', args: { action: 'list' }, expected: true },
    { name: 'gmail', args: { action: 'send' }, expected: false },
    { name: 'github', args: { action: 'merge_pr' }, expected: false },
    { name: 'calendar', args: {}, expected: false },
    { name: 'unknown_tool', args: {}, expected: false },
  ])('should return $expected for $name $args', ({ name, args, expected }) => {
    expect(isReadOnlyToolCall({ name, args })).toEqual(expected);
  });
});
