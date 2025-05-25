import { Injectable } from '@nestjs/common';
import { Competition } from '@services/scores-365';
import { BaseCacheService } from './base-cache.service';

const validForMinutes = 200;

@Injectable()
export class CompetitionsCacheService extends BaseCacheService<Competition[]> {
  private readonly key = 'competitions';

  constructor() {
    super(validForMinutes);
  }

  getCompetitions(): Competition[] | null {
    return this.getFromCache(this.key);
  }

  saveCompetitions(data: Competition[]): void {
    this.saveToCache(this.key, data);
  }
}
