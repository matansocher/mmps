const MAX_CACHE_ENTRIES = 500;

type CacheEntry<T> = { readonly value: T; readonly expiresAt: number };

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  peek(key: string): T | undefined {
    const cached = this.entries.get(key);
    return cached && cached.expiresAt > Date.now() ? cached.value : undefined;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  // ttlMs can depend on the loaded value (e.g. live games expire faster than finished ones).
  async get(key: string, ttlMs: number | ((value: T) => number), load: () => Promise<T>): Promise<T> {
    const cached = this.peek(key);
    if (cached !== undefined) return cached;
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await load();
        this.set(key, value, typeof ttlMs === 'function' ? ttlMs(value) : ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }

  private set(key: string, value: T, ttlMs: number): void {
    if (this.entries.size >= MAX_CACHE_ENTRIES) {
      const now = Date.now();
      for (const [k, entry] of this.entries) {
        if (entry.expiresAt <= now) this.entries.delete(k);
      }
      if (this.entries.size >= MAX_CACHE_ENTRIES) this.entries.delete(this.entries.keys().next().value);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
