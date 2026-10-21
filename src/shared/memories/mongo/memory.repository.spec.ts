import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMongoCollection } from '@core/mongo';
import { createMemory, deleteAllMemories, deleteMemory, findMemoryByContent, getMemories, getMemoryById, updateMemory } from './memory.repository';

vi.mock('@core/mongo', () => ({
  getMongoCollection: vi.fn(),
}));

describe('memory repository', () => {
  const toArray = vi.fn();
  const limit = vi.fn(() => ({ toArray }));
  const sort = vi.fn(() => ({ toArray, limit }));
  const find = vi.fn(() => ({ sort }));
  const findOne = vi.fn();
  const insertOne = vi.fn();
  const updateOne = vi.fn();
  const deleteOne = vi.fn();
  const deleteMany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ find, findOne, insertOne, updateOne, deleteOne, deleteMany } as never);
    toArray.mockResolvedValue([]);
  });

  it('should get memories for a chat newest first', async () => {
    await getMemories(123);
    expect(find).toHaveBeenCalledWith({ chatId: 123 });
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1, _id: -1 });
    expect(limit).not.toHaveBeenCalled();
  });

  it('should apply the limit when provided', async () => {
    await getMemories(123, 5);
    expect(limit).toHaveBeenCalledWith(5);
  });

  it('should find a memory by content case-insensitively with regex characters escaped', async () => {
    await findMemoryByContent(123, '  Likes C++ (a lot) ');
    expect(findOne).toHaveBeenCalledWith({ chatId: 123, content: { $regex: '^Likes C\\+\\+ \\(a lot\\)$', $options: 'i' } });
  });

  it('should create a trimmed memory and return it with its id', async () => {
    const insertedId = new ObjectId();
    insertOne.mockResolvedValue({ insertedId });
    const memory = await createMemory({ chatId: 123, content: '  Wife is vegetarian  ' });
    expect(memory).toEqual(expect.objectContaining({ _id: insertedId, chatId: 123, content: 'Wife is vegetarian' }));
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({ chatId: 123, content: 'Wife is vegetarian' }));
  });

  it('should scope lookups, updates and deletes to the chat', async () => {
    const id = new ObjectId();
    updateOne.mockResolvedValue({ matchedCount: 1 });
    deleteOne.mockResolvedValue({ deletedCount: 1 });

    await getMemoryById(id.toHexString(), 123);
    expect(findOne).toHaveBeenCalledWith({ _id: id, chatId: 123 });

    expect(await updateMemory(id.toHexString(), 123, ' new ')).toEqual(true);
    expect(updateOne).toHaveBeenCalledWith({ _id: id, chatId: 123 }, { $set: { content: 'new', updatedAt: expect.any(Date) } });

    expect(await deleteMemory(id, 123)).toEqual(true);
    expect(deleteOne).toHaveBeenCalledWith({ _id: id, chatId: 123 });
  });

  it('should return false/null for invalid ids without querying', async () => {
    expect(await getMemoryById('not-an-id', 123)).toEqual(null);
    expect(await updateMemory('not-an-id', 123, 'x')).toEqual(false);
    expect(await deleteMemory('not-an-id', 123)).toEqual(false);
    expect(findOne).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('should delete all memories for a chat and return the count', async () => {
    deleteMany.mockResolvedValue({ deletedCount: 3 });
    expect(await deleteAllMemories(123)).toEqual(3);
    expect(deleteMany).toHaveBeenCalledWith({ chatId: 123 });
  });
});
