import { CompiledStateGraph } from '@langchain/langgraph';
import { describe, expect, it, vi } from 'vitest';
import { AiService } from './service';

function createService() {
  const invoke = vi.fn().mockResolvedValue({ messages: [] });
  const stream = vi.fn();
  const graph = { invoke, stream } as unknown as CompiledStateGraph<any, any>;
  const service = new AiService(graph, { name: 'CHATBOT' });
  return { service, invoke };
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
