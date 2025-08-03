import { Injectable } from '@nestjs/common';
import { BaseCache } from '@core/services';
import { Location } from '../types';

type TrackData = {
  chatId?: number;
  startLocation: Location;
  lastAnnounced: Date;
  startDate: Date;
  endDate?: Date;
};

const validForMinutes = 30;

@Injectable()
export class TracksCacheService extends BaseCache<TrackData> {
  private readonly key = 'track';

  constructor() {
    super(validForMinutes);
  }

  getTrack(): TrackData | null {
    return this.getFromCache(this.key);
  }

  saveTrack(data: Partial<TrackData>): void {
    const currentTrack = this.getTrack();
    this.saveToCache(this.key, { ...currentTrack, ...data });
  }

  clearTrack(): void {
    this.saveToCache(this.key, null);
  }
}
