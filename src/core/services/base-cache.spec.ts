import { BaseCache } from './base-cache';
import { getRedisConnection } from './redis';

const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock('./redis', () => ({
  getRedisConnection: vi.fn(() => redis),
}));

type CachedValue = {
  readonly id: number;
  readonly name: string;
};

class TestCache extends BaseCache<CachedValue> {
  get(key: string): Promise<CachedValue | null> {
    return this.getFromCache(key);
  }

  save(key: string, data: CachedValue): Promise<void> {
    return this.saveToCache(key, data);
  }
}

describe('BaseCache', () => {
  const cache = new TestCache(5, 'test');

  beforeEach(() => {
    vi.mocked(getRedisConnection).mockClear();
    redis.get.mockReset();
    redis.set.mockReset();
    redis.del.mockReset();
  });

  it('should return null when the cache entry is missing', async () => {
    redis.get.mockResolvedValue(null);

    await expect(cache.get('missing')).resolves.toEqual(null);
    expect(redis.get).toHaveBeenCalledWith('test:missing');
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('should return a parsed cache entry', async () => {
    redis.get.mockResolvedValue('{"id":1,"name":"cached"}');

    await expect(cache.get('valid')).resolves.toEqual({ id: 1, name: 'cached' });
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('should remove a malformed cache entry and return null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    redis.get.mockResolvedValue('{invalid');
    redis.del.mockResolvedValue(1);

    await expect(cache.get('malformed')).resolves.toEqual(null);
    expect(redis.del).toHaveBeenCalledWith('test:malformed');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to parse cache entry 'test:malformed'"));

    warn.mockRestore();
  });

  it('should save serialized data with the configured TTL', async () => {
    redis.set.mockResolvedValue('OK');

    await expect(cache.save('saved', { id: 2, name: 'value' })).resolves.toBeUndefined();
    expect(redis.set).toHaveBeenCalledWith('test:saved', '{"id":2,"name":"value"}', 'EX', 300);
  });

  it('should preserve Redis read errors', async () => {
    const error = new Error('Redis unavailable');
    redis.get.mockRejectedValue(error);

    await expect(cache.get('failed')).rejects.toBe(error);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('should preserve Redis delete errors for malformed entries', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = new Error('Redis delete failed');
    redis.get.mockResolvedValue('{invalid');
    redis.del.mockRejectedValue(error);

    await expect(cache.get('malformed')).rejects.toBe(error);

    warn.mockRestore();
  });

  it('should preserve Redis write errors', async () => {
    const error = new Error('Redis unavailable');
    redis.set.mockRejectedValue(error);

    await expect(cache.save('failed', { id: 3, name: 'value' })).rejects.toBe(error);
  });
});
