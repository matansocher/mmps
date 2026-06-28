import { getRedisConnection } from './redis';

export class BaseCache<T> {
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
    const raw = await redis.get(this.buildKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  protected async saveToCache(key: string, data: T): Promise<void> {
    const redis = getRedisConnection();
    await redis.set(this.buildKey(key), JSON.stringify(data), 'EX', this.ttlSeconds);
  }
}
