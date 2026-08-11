import { getErrorMessage, Logger } from '@core/utils';
import { getRedisConnection } from './redis';

export class BaseCache<T> {
  private readonly logger = new Logger(BaseCache.name);
  private readonly ttlSeconds: number;
  private readonly prefix: string;

  constructor(validForMinutes: number, prefix: string) {
    this.ttlSeconds = validForMinutes * 60;
    this.prefix = prefix;
  }

  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  protected async getFromCache(key: string): Promise<T | null> {
    const redis = getRedisConnection();
    const cacheKey = this.buildKey(key);
    const raw = await redis.get(cacheKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse cache entry '${cacheKey}': ${getErrorMessage(err)}. Removing invalid entry.`);
      await redis.del(cacheKey);
      return null;
    }
  }

  protected async saveToCache(key: string, data: T): Promise<void> {
    const redis = getRedisConnection();
    await redis.set(this.buildKey(key), JSON.stringify(data), 'EX', this.ttlSeconds);
  }
}
