import { Injectable } from '@nestjs/common';
import { CompetitionDetails } from '@services/scores-365';
import { BaseCacheService } from './base-cache.service';

const validForMinutes = 5;

@Injectable()
export class CompetitionMatchesCacheService extends BaseCacheService<CompetitionDetails> {
  constructor() {
    super(validForMinutes);
  }

  getCompetitionMatches(competitionId: number): CompetitionDetails | null {
    return this.getFromCache(competitionId.toString());
  }

  saveCompetitionMatches(competitionId: number, data: CompetitionDetails): void {
    this.saveToCache(competitionId.toString(), data);
  }
}
