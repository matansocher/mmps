import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { DANGLING_TOOL_CALL_CONTENT, repairDanglingToolCalls } from './dangling-tool-calls';

function aiWithCalls(...ids: string[]): AIMessage {
  return new AIMessage({ content: '', tool_calls: ids.map((id) => ({ id, name: 'match_summary', args: {} })) });
}

function toolResult(id: string): ToolMessage {
  return new ToolMessage({ content: 'ok', tool_call_id: id });
}

function describeMessages(messages: ReturnType<typeof repairDanglingToolCalls>['messages']): string[] {
  return messages.map((m) => (ToolMessage.isInstance(m) ? `tool:${m.tool_call_id}:${m.content === DANGLING_TOOL_CALL_CONTENT ? 'patched' : 'ok'}` : m.getType()));
}

describe('repairDanglingToolCalls()', () => {
  it('returns the same messages when every tool call has a result', () => {
    const messages = [new HumanMessage('hi'), aiWithCalls('a', 'b'), toolResult('a'), toolResult('b'), new AIMessage('done')];

    const result = repairDanglingToolCalls(messages);

    expect(result.messages).toBe(messages);
    expect(result.repaired).toEqual(0);
  });

  it('patches missing results after the existing tool messages of the same step', () => {
    const messages = [new HumanMessage('hi'), aiWithCalls('a', 'b'), toolResult('a')];

    const result = repairDanglingToolCalls(messages);

    expect(result.repaired).toEqual(1);
    expect(describeMessages(result.messages)).toEqual(['human', 'ai', 'tool:a:ok', 'tool:b:patched']);
  });

  it('patches a dangling step in the middle of the thread before the next user message', () => {
    const messages = [new HumanMessage('hi'), aiWithCalls('a'), new HumanMessage('again'), aiWithCalls('b'), toolResult('b')];

    const result = repairDanglingToolCalls(messages);

    expect(result.repaired).toEqual(1);
    expect(describeMessages(result.messages)).toEqual(['human', 'ai', 'tool:a:patched', 'human', 'ai', 'tool:b:ok']);
  });
});
