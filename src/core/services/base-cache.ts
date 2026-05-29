export type CacheEntry<T> = {
  readonly lastUpdated: number;
  readonly data: T;
};

export class BaseCache<T> {
  private readonly cache: Record<string, CacheEntry<T>> = {};
  private readonly validForMs: number;

  constructor(validForMinutes: number, _prefix?: string) {
    this.validForMs = validForMinutes * 60 * 1000;
  }

  protected async getFromCache(key: string): Promise<T | null> {
    const entry = this.cache[key];
    if (!entry) return null;

    const isExpired = Date.now() - entry.lastUpdated > this.validForMs;
    if (isExpired) {
      delete this.cache[key];
      return null;
    }

    return entry.data;
  }

  protected async saveToCache(key: string, data: T): Promise<void> {
    this.cache[key] = { lastUpdated: Date.now(), data };
  }
}
