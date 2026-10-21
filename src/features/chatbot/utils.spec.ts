import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it, test } from 'vitest';
import { buildProactiveMessageContent, formatAgentResponse, getReplyContextText, withReplyContext } from './utils';

describe('formatAgentResponse()', () => {
  it('should pair a single tool call with its result by tool_call_id', () => {
    const messages = [
      new HumanMessage('What is the weather?'),
      new AIMessage({ content: '', tool_calls: [{ name: 'weather', args: {}, id: 'call-1' }] }),
      new ToolMessage({ content: '{"temp":25}', tool_call_id: 'call-1' }),
      new AIMessage('It is 25 degrees.'),
    ];

    const result = formatAgentResponse({ messages });

    expect(result.message).toEqual('It is 25 degrees.');
    expect(result.toolResults).toEqual([{ toolName: 'weather', data: { temp: 25 }, error: undefined }]);
  });

  it('should pair parallel tool calls with the correct results by tool_call_id, not position', () => {
    const messages = [
      new HumanMessage('Weather and calendar please'),
      new AIMessage({
        content: '',
        tool_calls: [
          { name: 'weather', args: {}, id: 'call-weather' },
          { name: 'calendar', args: {}, id: 'call-calendar' },
        ],
      }),
      // ToolMessages arrive in a different order than the tool_calls to prove id-based matching.
      new ToolMessage({ content: '{"events":3}', tool_call_id: 'call-calendar' }),
      new ToolMessage({ content: '{"temp":25}', tool_call_id: 'call-weather' }),
      new AIMessage('Done.'),
    ];

    const result = formatAgentResponse({ messages });

    expect(result.toolResults).toEqual([
      { toolName: 'weather', data: { temp: 25 }, error: undefined },
      { toolName: 'calendar', data: { events: 3 }, error: undefined },
    ]);
  });

  it('should keep raw string content when the tool result is not valid JSON', () => {
    const messages = [
      new AIMessage({ content: '', tool_calls: [{ name: 'echo', args: {}, id: 'call-1' }] }),
      new ToolMessage({ content: 'plain text', tool_call_id: 'call-1' }),
      new AIMessage('ok'),
    ];

    const result = formatAgentResponse({ messages });

    expect(result.toolResults).toEqual([{ toolName: 'echo', data: 'plain text', error: undefined }]);
  });

  it('should skip tool calls that have no matching ToolMessage result', () => {
    const messages = [
      new AIMessage({
        content: '',
        tool_calls: [
          { name: 'weather', args: {}, id: 'call-weather' },
          { name: 'calendar', args: {}, id: 'call-calendar' },
        ],
      }),
      new ToolMessage({ content: '{"temp":25}', tool_call_id: 'call-weather' }),
      new AIMessage('Partial.'),
    ];

    const result = formatAgentResponse({ messages });

    expect(result.toolResults).toEqual([{ toolName: 'weather', data: { temp: 25 }, error: undefined }]);
  });

  it('should return an empty toolResults array when there are no tool calls', () => {
    const messages = [new HumanMessage('Hi'), new AIMessage('Hello!')];

    const result = formatAgentResponse({ messages });

    expect(result.message).toEqual('Hello!');
    expect(result.toolResults).toEqual([]);
  });

  it('should scope toolResults to the current turn and ignore previous turns retained in history', () => {
    const messages = [
      // Previous turn — should be ignored.
      new HumanMessage('Weather yesterday?'),
      new AIMessage({ content: '', tool_calls: [{ name: 'weather', args: {}, id: 'old-call' }] }),
      new ToolMessage({ content: '{"temp":10}', tool_call_id: 'old-call' }),
      new AIMessage('It was 10 degrees.'),
      // Current turn.
      new HumanMessage('Weather now?'),
      new AIMessage({ content: '', tool_calls: [{ name: 'weather', args: {}, id: 'new-call' }] }),
      new ToolMessage({ content: '{"temp":25}', tool_call_id: 'new-call' }),
      new AIMessage('It is 25 degrees.'),
    ];

    const result = formatAgentResponse({ messages });

    expect(result.message).toEqual('It is 25 degrees.');
    expect(result.toolResults).toEqual([{ toolName: 'weather', data: { temp: 25 }, error: undefined }]);
  });

  it('should throw when the final message is not an assistant response', () => {
    const messages = [new HumanMessage('Hi'), new AIMessage({ content: '', tool_calls: [{ name: 'weather', args: {}, id: 'call-1' }] })];

    expect(() => formatAgentResponse({ messages })).toThrow('Agent did not produce a final assistant response');
  });
});

describe('getReplyContextText()', () => {
  test.each([
    { name: 'no message', message: undefined, expected: null },
    { name: 'not a reply', message: { text: 'hi' }, expected: null },
    { name: 'reply to text', message: { reply_to_message: { text: ' original ' } }, expected: 'original' },
    { name: 'reply to caption', message: { reply_to_message: { caption: 'photo caption' } }, expected: 'photo caption' },
    { name: 'partial quote wins', message: { quote: { text: 'part' }, reply_to_message: { text: 'full original' } }, expected: 'part' },
    { name: 'reply without text', message: { reply_to_message: { photo: [] } }, expected: null },
  ])('should return $expected for $name', ({ message, expected }) => {
    expect(getReplyContextText(message as any)).toEqual(expected);
  });

  it('should truncate long replied-to text', () => {
    const result = getReplyContextText({ reply_to_message: { text: 'a'.repeat(1500) } } as any);
    expect(result).toEqual(`${'a'.repeat(1000)}…`);
  });
});

describe('withReplyContext()', () => {
  test.each([
    { replyText: null, expected: 'do it' },
    { replyText: 'meeting at 5', expected: '[Replying to: "meeting at 5"]\n\ndo it' },
  ])('should return $expected when replyText is $replyText', ({ replyText, expected }) => {
    expect(withReplyContext('do it', replyText)).toEqual(expected);
  });
});

describe('buildProactiveMessageContent()', () => {
  // 2025-06-01 07:30 UTC is 10:30 in Asia/Jerusalem (IDT)
  const now = new Date('2025-06-01T07:30:00Z');

  test.each([
    { text: 'hello', maxChars: 10, expectedBody: 'hello' },
    { text: '1234567890', maxChars: 10, expectedBody: '1234567890' },
    { text: '12345678901', maxChars: 10, expectedBody: '1234567890…(truncated)' },
  ])('should produce body "$expectedBody" for "$text" with maxChars $maxChars', ({ text, maxChars, expectedBody }) => {
    expect(buildProactiveMessageContent(text, 'daily-summary', maxChars, now)).toEqual(`[Scheduled message: daily-summary, sent 2025-06-01 10:30 (Asia/Jerusalem)]\n\n${expectedBody}`);
  });
});
