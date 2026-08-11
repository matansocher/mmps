import type { Collection } from 'mongodb';
import { Logger } from '@core/utils';
import { getMongoCollection } from './mongo-connection';
import { createUserRepository } from './user.repository';
import type { UserDetails } from './types';

vi.mock('./mongo-connection', () => ({
  getMongoCollection: vi.fn(),
}));

describe('createUserRepository()', () => {
  const userDetails: UserDetails = {
    chatId: 123,
    telegramUserId: 456,
    firstName: 'Test',
    lastName: 'User',
    username: 'test-user',
  };

  const findOne = vi.fn();
  const updateOne = vi.fn();
  const insertOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockImplementation(<T>() => ({ findOne, updateOne, insertOne }) as unknown as Collection<T>);
  });

  it('should return created when inserting a new user', async () => {
    findOne.mockResolvedValue(null);
    insertOne.mockResolvedValue({ acknowledged: true, insertedId: userDetails.chatId });

    const { saveUserDetails } = createUserRepository('Test');

    await expect(saveUserDetails(userDetails)).resolves.toEqual('created');
    expect(insertOne).toHaveBeenCalledWith({
      ...userDetails,
      createdAt: expect.any(Date),
    });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('should return updated when updating an existing user', async () => {
    findOne.mockResolvedValue({ ...userDetails, createdAt: new Date() });
    updateOne.mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null });

    const { saveUserDetails } = createUserRepository('Test');

    await expect(saveUserDetails(userDetails)).resolves.toEqual('updated');
    expect(updateOne).toHaveBeenCalledWith({ chatId: userDetails.chatId }, { $set: userDetails });
    expect(insertOne).not.toHaveBeenCalled();
  });

  it('should log and propagate database failures', async () => {
    const error = new Error('insert failed');
    const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    findOne.mockResolvedValue(null);
    insertOne.mockRejectedValue(error);

    const { saveUserDetails } = createUserRepository('Test');

    await expect(saveUserDetails(userDetails)).rejects.toBe(error);
    expect(loggerError).toHaveBeenCalledWith('saveUserDetails - err: insert failed');
  });
});
