import { Injectable } from '@nestjs/common';
import { CompetitionDetails } from '@services/scores-365';
import { BaseCacheService } from './base-cache.service';

const validForMinutes = 5;

@Injectable()
export class MatchesSummaryCacheService extends BaseCacheService<CompetitionDetails[]> {
  constructor() {
    super(validForMinutes);
  }

  getMatchesSummary(date: string): CompetitionDetails[] | null {
    return this.getFromCache(date);
  }

  saveMatchesSummary(date: string, data: CompetitionDetails[]): void {
    this.saveToCache(date, data);
  }
}
