export interface CacheEntry<T> {
  readonly lastUpdated: number;
  readonly data: T;
}

export class BaseCacheService<T> {
  private cache: Record<string, CacheEntry<T>> = {};
  private readonly validForMs: number;

  constructor(validForMinutes: number) {
    this.validForMs = validForMinutes * 60 * 1000;
  }

  protected getFromCache(key: string): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    const isExpired = Date.now() - entry.lastUpdated > this.validForMs;
    if (isExpired) {
      delete this.cache[key];
      return null;
    }

    return entry.data;
  }

  protected saveToCache(key: string, data: T): void {
    this.cache[key] = {
      lastUpdated: Date.now(),
      data,
    };
  }
}
