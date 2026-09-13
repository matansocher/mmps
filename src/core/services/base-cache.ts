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
    let raw: string | null;
    try {
      raw = await redis.get(cacheKey);
    } catch (err) {
      // A cache outage must not block the request path — fall through to the origin instead of failing.
      this.logger.warn(`Failed to read cache entry '${cacheKey}': ${getErrorMessage(err)}. Falling back to origin.`);
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Failed to parse cache entry '${cacheKey}': ${getErrorMessage(err)}. Removing invalid entry.`);
      await redis.del(cacheKey).catch(() => undefined);
      return null;
    }
  }

  protected async saveToCache(key: string, data: T): Promise<void> {
    const redis = getRedisConnection();
    const cacheKey = this.buildKey(key);
    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', this.ttlSeconds);
    } catch (err) {
      // Writes are best-effort — a cache outage should degrade to a no-op, not break the caller.
      this.logger.warn(`Failed to write cache entry '${cacheKey}': ${getErrorMessage(err)}.`);
    }
  }
}
