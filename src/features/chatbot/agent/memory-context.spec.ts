import { SystemMessage } from '@langchain/core/messages';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMemories } from '@shared/memories';
import { createMemoryContextMiddleware } from './memory-context';

vi.mock('@shared/memories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/memories')>()),
  getMemories: vi.fn(),
}));

type WrapModelCall = (request: unknown, handler: (request: unknown) => unknown) => Promise<unknown>;

describe('createMemoryContextMiddleware()', () => {
  const wrapModelCall = createMemoryContextMiddleware({ maxFacts: 10, maxChars: 1000 }).wrapModelCall as unknown as WrapModelCall;
  const handler = vi.fn((request: unknown) => request);
  const request = { systemMessage: new SystemMessage('base prompt'), messages: [] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should append memories to the system message', async () => {
    vi.mocked(getMemories).mockResolvedValue([{ _id: new ObjectId(), chatId: 1, content: 'Wife is vegetarian', createdAt: new Date(), updatedAt: new Date() }]);
    const result = (await wrapModelCall(request, handler)) as typeof request;
    expect(getMemories).toHaveBeenCalledWith(expect.any(Number), 10);
    expect(result.systemMessage.text).toContain('base prompt');
    expect(result.systemMessage.text).toContain('Wife is vegetarian');
    expect(request.systemMessage.text).toEqual('base prompt');
  });

  it('should pass the request through unchanged when there are no memories', async () => {
    vi.mocked(getMemories).mockResolvedValue([]);
    await wrapModelCall(request, handler);
    expect(handler).toHaveBeenCalledWith(request);
  });

  it('should pass the request through unchanged when loading fails', async () => {
    vi.mocked(getMemories).mockRejectedValue(new Error('db down'));
    await wrapModelCall(request, handler);
    expect(handler).toHaveBeenCalledWith(request);
  });
});
