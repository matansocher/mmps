import { Injectable } from '@nestjs/common';
import { BaseCache } from '@core/services';
import { Competition } from '@services/scores-365';

const validForMinutes = 200;

@Injectable()
export class CompetitionsCacheService extends BaseCache<Competition[]> {
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
