import { MongoServerError } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { addSubscription } from './subscription';

vi.mock('@core/mongo', () => ({ getMongoCollection: vi.fn() }));

describe('addSubscription()', () => {
  const insertOne = vi.fn();

  beforeEach(() => {
    insertOne.mockReset();
    vi.mocked(getMongoCollection).mockReturnValue({ insertOne } as never);
  });

  it('should insert an active subscription', async () => {
    insertOne.mockResolvedValue({ acknowledged: true });

    const result = await addSubscription(1, 'Pizza', 'photo');

    expect(result).toEqual({ acknowledged: true });
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({ chatId: 1, restaurant: 'Pizza', restaurantPhoto: 'photo', isActive: true }));
  });

  it('should return null when an active subscription already exists', async () => {
    insertOne.mockRejectedValue(new MongoServerError({ code: 11000, message: 'E11000 duplicate key error' }));

    expect(await addSubscription(1, 'Pizza', 'photo')).toBeNull();
  });

  it('should rethrow other errors', async () => {
    insertOne.mockRejectedValue(new Error('network'));

    await expect(addSubscription(1, 'Pizza', 'photo')).rejects.toThrow('network');
  });
});
