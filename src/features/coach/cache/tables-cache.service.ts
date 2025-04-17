import { Injectable } from '@nestjs/common';
import { CompetitionTableDetails } from '@services/scores-365';
import { BaseCacheService } from './base-cache.service';

const validForMinutes = 30;

@Injectable()
export class CompetitionTableCacheService extends BaseCacheService<CompetitionTableDetails> {
  constructor() {
    super(validForMinutes);
  }

  getCompetitionTable(competitionId: number): CompetitionTableDetails | null {
    return this.getFromCache(competitionId.toString());
  }

  saveCompetitionTable(competitionId: number, data: CompetitionTableDetails): void {
    this.saveToCache(competitionId.toString(), data);
  }
}
