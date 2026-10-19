import { BaseCache } from '@core/services';
import { getErrorMessage, Logger } from '@core/utils';
import type { SearchTrainsResult } from './types';

// Live delays and platforms change often, so keep the window short. It still absorbs repeated
// identical searches (button spam, "again?") so we don't hammer the rail API and get rate limited.
const VALID_FOR_MINUTES = 3;

export class TrainSearchCache extends BaseCache<SearchTrainsResult> {
  private readonly cacheLogger = new Logger(TrainSearchCache.name);

  constructor() {
    super(VALID_FOR_MINUTES, 'israel-rail:search');
  }

  async get(key: string): Promise<SearchTrainsResult | null> {
    try {
      return await this.getFromCache(key);
    } catch (err) {
      // getRedisConnection throws synchronously when REDIS_URL is missing (local dev) — treat as a miss.
      this.cacheLogger.warn(`Cache read skipped: ${getErrorMessage(err)}`);
      return null;
    }
  }

  async save(key: string, data: SearchTrainsResult): Promise<void> {
    try {
      await this.saveToCache(key, data);
    } catch (err) {
      this.cacheLogger.warn(`Cache write skipped: ${getErrorMessage(err)}`);
    }
  }
}

export const trainSearchCache = new TrainSearchCache();
