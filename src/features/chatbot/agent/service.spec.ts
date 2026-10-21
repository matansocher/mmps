import { AIMessage } from '@langchain/core/messages';
import { describe, expect, it, vi } from 'vitest';
import { ChatbotAgent } from './factory';
import { AiService } from './service';

function createService() {
  const invoke = vi.fn().mockResolvedValue({ messages: [] });
  const stream = vi.fn();
  const updateState = vi.fn().mockResolvedValue({});
  const graph = { invoke, stream, graph: { getState: vi.fn(), updateState } } as unknown as ChatbotAgent;
  const service = new AiService(graph, { name: 'CHATBOT' });
  return { service, invoke, updateState };
}

describe('AiService invocation metadata', () => {
  it('attaches runId, runName, tags and metadata to the config', async () => {
    const { service, invoke } = createService();

    await service.invoke('hello', { threadId: '123' });

    const config = invoke.mock.calls[0][1];
    expect(config.runId).toEqual(expect.any(String));
    expect(config.runName).toBe('chatbot.turn');
    expect(config.tags).toContain('chatbot');
    expect(config.metadata).toMatchObject({
      runId: config.runId,
      invocationSource: 'chatbot',
      agentName: 'CHATBOT',
      threadId: '123',
    });
    expect(config.metadata.agentVersion).toEqual(expect.any(String));
  });

  it('honors an explicit runId and invocationSource', async () => {
    const { service, invoke } = createService();

    await service.invoke('hello', { runId: 'fixed-run-id', invocationSource: 'chatbot-secretary', requestId: 'req-1' });

    const config = invoke.mock.calls[0][1];
    expect(config.runId).toBe('fixed-run-id');
    expect(config.tags).toContain('chatbot-secretary');
    expect(config.metadata).toMatchObject({
      runId: 'fixed-run-id',
      invocationSource: 'chatbot-secretary',
      requestId: 'req-1',
    });
  });

  it('does not leak the message content into metadata', async () => {
    const { service, invoke } = createService();

    await service.invoke('super secret prompt', { threadId: '123' });

    const config = invoke.mock.calls[0][1];
    expect(JSON.stringify(config.metadata)).not.toContain('super secret prompt');
  });
});

describe('AiService.appendMessages()', () => {
  it('appends the messages to the thread without a node attribution', async () => {
    const { service, updateState } = createService();
    const messages = [new AIMessage('digest')];

    await service.appendMessages(messages, { threadId: '123' });

    expect(updateState).toHaveBeenCalledTimes(1);
    const [config, values, asNode] = updateState.mock.calls[0];
    expect(config.configurable).toEqual({ thread_id: '123' });
    expect(values).toEqual({ messages });
    expect(asNode).toBeUndefined();
  });

  it('throws when no threadId is given', async () => {
    const { service, updateState } = createService();

    await expect(service.appendMessages([new AIMessage('digest')])).rejects.toThrow('threadId is required');
    expect(updateState).not.toHaveBeenCalled();
  });
});
