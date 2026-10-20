import { BaseCache } from '@core/services';
import { getErrorMessage, Logger } from '@core/utils';
import { NEARBY_CACHE_MINUTES, TIMETABLE_CACHE_MINUTES } from './constants';
import type { LightRailTimetable, NearbyLightRailResult } from './types';

export class LightRailTimetableCache extends BaseCache<LightRailTimetable> {
  private readonly cacheLogger = new Logger(LightRailTimetableCache.name);

  constructor() {
    super(TIMETABLE_CACHE_MINUTES, 'light-rail:timetable');
  }

  async get(key: string): Promise<LightRailTimetable | null> {
    try {
      return await this.getFromCache(key);
    } catch (err) {
      this.cacheLogger.warn(`Cache read skipped: ${getErrorMessage(err)}`);
      return null;
    }
  }

  async save(key: string, data: LightRailTimetable): Promise<void> {
    try {
      await this.saveToCache(key, data);
    } catch (err) {
      this.cacheLogger.warn(`Cache write skipped: ${getErrorMessage(err)}`);
    }
  }
}

export const lightRailTimetableCache = new LightRailTimetableCache();

export class NearbyLightRailCache extends BaseCache<NearbyLightRailResult> {
  private readonly cacheLogger = new Logger(NearbyLightRailCache.name);

  constructor() {
    super(NEARBY_CACHE_MINUTES, 'light-rail:nearby');
  }

  async get(key: string): Promise<NearbyLightRailResult | null> {
    try {
      return await this.getFromCache(key);
    } catch (err) {
      this.cacheLogger.warn(`Cache read skipped: ${getErrorMessage(err)}`);
      return null;
    }
  }

  async save(key: string, data: NearbyLightRailResult): Promise<void> {
    try {
      await this.saveToCache(key, data);
    } catch (err) {
      this.cacheLogger.warn(`Cache write skipped: ${getErrorMessage(err)}`);
    }
  }
}

export const nearbyLightRailCache = new NearbyLightRailCache();
