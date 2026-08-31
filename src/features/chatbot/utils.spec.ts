import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';
import { formatAgentResponse } from './utils';

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
});
