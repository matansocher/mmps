import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { nextCarsSearchCount } from './cars-search.repository';

vi.mock('@core/mongo', () => ({ getMongoCollection: vi.fn() }));

describe('nextCarsSearchCount()', () => {
  const findOneAndUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ findOneAndUpdate } as unknown as Collection);
  });

  test.each([1, 3, 6])('should return the persisted count %s using an atomic update keyed by sender', async (count) => {
    findOneAndUpdate.mockResolvedValueOnce({ _id: '972500000000', count });
    await expect(nextCarsSearchCount('972500000000')).resolves.toEqual(count);
    expect(getMongoCollection).toHaveBeenCalledWith('Whatsapp', 'cars_search_counts');
    expect(findOneAndUpdate).toHaveBeenCalledWith({ _id: '972500000000' }, { $inc: { count: 1 } }, { upsert: true, returnDocument: 'after' });
  });
});
