import type { Serialized } from '@langchain/core/load/serializable';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent, fakeModel, tool } from 'langchain';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { DEFAULT_TOOL_STATUS_LABEL, getToolStatusLabel } from './tool-status-labels';
import { TOOL_STATUS_MIN_UPDATE_INTERVAL_MS, ToolStatusApi, ToolStatusReporter } from './tool-status-reporter';

const CHAT_ID = 42;
const MESSAGE_ID = 7;
const TOOL = {} as Serialized;

function createApi() {
  return {
    sendMessage: vi.fn().mockResolvedValue({ message_id: MESSAGE_ID }),
    editMessageText: vi.fn().mockResolvedValue(true),
    deleteMessage: vi.fn().mockResolvedValue(true),
    sendChatAction: vi.fn().mockResolvedValue(true),
  };
}

function startTool(reporter: ToolStatusReporter, runId: string, toolName: string): void {
  reporter.handleToolStart(TOOL, '{}', runId, undefined, undefined, undefined, toolName);
}

describe('getToolStatusLabel()', () => {
  test.each([
    { toolName: 'web_search', expected: '🔎 Searching the web' },
    { toolName: 'israel_rail', expected: '🚆 Checking trains' },
    { toolName: 'some_new_tool', expected: DEFAULT_TOOL_STATUS_LABEL },
    { toolName: 'final_reply', expected: undefined },
  ])('should return $expected for $toolName', ({ toolName, expected }) => {
    expect(getToolStatusLabel(toolName)).toEqual(expected);
  });
});

describe('ToolStatusReporter', () => {
  let api: ReturnType<typeof createApi>;
  let reporter: ToolStatusReporter;

  beforeEach(() => {
    vi.useFakeTimers();
    api = createApi();
    reporter = new ToolStatusReporter(api as unknown as ToolStatusApi, CHAT_ID);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should not send anything when no tool runs', async () => {
    await vi.runAllTimersAsync();
    await reporter.dispose();
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(api.deleteMessage).not.toHaveBeenCalled();
  });

  test('should send a status message when the first tool starts', async () => {
    startTool(reporter, 'r1', 'web_search');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.sendMessage).toHaveBeenCalledWith(CHAT_ID, '🔎 Searching the web…');
    expect(api.sendChatAction).toHaveBeenCalledWith(CHAT_ID, 'typing');
  });

  test('should ignore hidden tools', async () => {
    startTool(reporter, 'r1', 'final_reply');
    await vi.runAllTimersAsync();
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  test('should join parallel tools on one line and throttle edits', async () => {
    startTool(reporter, 'r1', 'web_search');
    await vi.advanceTimersByTimeAsync(0);
    startTool(reporter, 'r2', 'israel_rail');
    startTool(reporter, 'r3', 'web_search');
    await vi.advanceTimersByTimeAsync(TOOL_STATUS_MIN_UPDATE_INTERVAL_MS - 100);
    expect(api.editMessageText).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(api.editMessageText).toHaveBeenCalledTimes(1);
    expect(api.editMessageText).toHaveBeenCalledWith(CHAT_ID, MESSAGE_ID, '🔎 Searching the web · 🚆 Checking trains…');
  });

  test('should show the writing status once all tools finish', async () => {
    startTool(reporter, 'r1', 'weather');
    reporter.handleToolEnd('ok', 'r1');
    await vi.runAllTimersAsync();
    expect(api.sendMessage).toHaveBeenCalledWith(CHAT_ID, '✍️ Writing the answer…');
  });

  test('should treat a failed tool as finished', async () => {
    startTool(reporter, 'r1', 'weather');
    await vi.advanceTimersByTimeAsync(0);
    reporter.handleToolError(new Error('boom'), 'r1');
    await vi.runAllTimersAsync();
    expect(api.editMessageText).toHaveBeenCalledWith(CHAT_ID, MESSAGE_ID, '✍️ Writing the answer…');
  });

  test('should skip edits when the text did not change', async () => {
    startTool(reporter, 'r1', 'web_search');
    await vi.advanceTimersByTimeAsync(0);
    reporter.handleToolEnd('ok', 'r1');
    startTool(reporter, 'r2', 'web_search');
    await vi.runAllTimersAsync();
    expect(api.editMessageText).not.toHaveBeenCalled();
  });

  test('should delete the status message on dispose and stop updating', async () => {
    startTool(reporter, 'r1', 'web_search');
    await vi.advanceTimersByTimeAsync(0);
    await reporter.dispose();
    expect(api.deleteMessage).toHaveBeenCalledWith(CHAT_ID, MESSAGE_ID);

    startTool(reporter, 'r2', 'calendar');
    await vi.runAllTimersAsync();
    expect(api.editMessageText).not.toHaveBeenCalled();
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('should delete a status message that was still being sent on dispose', async () => {
    let resolveSend: (value: { message_id: number }) => void;
    api.sendMessage.mockReturnValue(new Promise((resolve) => (resolveSend = resolve)));
    startTool(reporter, 'r1', 'web_search');
    await vi.advanceTimersByTimeAsync(0);

    const disposing = reporter.dispose();
    resolveSend({ message_id: MESSAGE_ID });
    await disposing;
    expect(api.deleteMessage).toHaveBeenCalledWith(CHAT_ID, MESSAGE_ID);
  });

  test('should not throw when Telegram calls fail', async () => {
    api.sendMessage.mockRejectedValue(new Error('429'));
    startTool(reporter, 'r1', 'web_search');
    await vi.runAllTimersAsync();
    await expect(reporter.dispose()).resolves.toBeUndefined();
    expect(api.deleteMessage).not.toHaveBeenCalled();
  });
});

describe('ToolStatusReporter with an agent run', () => {
  test('should receive parallel tool events as per-turn callbacks', async () => {
    const api = createApi();
    const reporter = new ToolStatusReporter(api as unknown as ToolStatusApi, CHAT_ID);
    const renders: string[] = [];
    const record = (value: string) =>
      tool(
        async () => {
          // Callback handlers are dispatched in the background, so let both tool starts land first
          await new Promise((resolve) => setTimeout(resolve, 20));
          renders.push(reporter.render());
          return value;
        },
        { name: value, description: value, schema: z.object({}) },
      );
    const model = fakeModel()
      .respondWithTools([
        { name: 'web_search', args: {} },
        { name: 'israel_rail', args: {} },
      ])
      .respond(new AIMessage('done'));
    const agent = createAgent({ model, tools: [record('web_search'), record('israel_rail')], checkpointer: new MemorySaver() });

    await agent.invoke({ messages: [new HumanMessage('trains?')] }, { configurable: { thread_id: 't1' }, callbacks: [reporter] });

    expect(renders.some((text) => text.includes('🔎 Searching the web') && text.includes('🚆 Checking trains'))).toEqual(true);
    expect(reporter.render()).toEqual('✍️ Writing the answer…');
    await reporter.dispose();
  });
});
