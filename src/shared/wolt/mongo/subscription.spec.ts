import { MongoServerError } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { addSubscription, getExpiredSubscriptions, getSubscriptionById } from './subscription';

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

describe('getExpiredSubscriptions()', () => {
  it('should match subscriptions past expiresAt, and old ones without it by createdAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    const find = vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    vi.mocked(getMongoCollection).mockReturnValue({ find } as never);

    await getExpiredSubscriptions(4);
    vi.useRealTimers();

    expect(find).toHaveBeenCalledWith({
      isActive: true,
      $or: [{ expiresAt: { $lt: new Date('2024-01-01T10:00:00Z') } }, { expiresAt: null, createdAt: { $lt: new Date('2024-01-01T06:00:00Z') } }],
    });
  });
});

describe('getSubscriptionById()', () => {
  it('should return null for an invalid id without querying', async () => {
    const findOne = vi.fn();
    vi.mocked(getMongoCollection).mockReturnValue({ findOne } as never);

    expect(await getSubscriptionById('not-an-id')).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
