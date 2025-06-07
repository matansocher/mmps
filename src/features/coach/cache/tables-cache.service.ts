import { Injectable } from '@nestjs/common';
import { BaseCache } from '@core/services';
import { CompetitionTableDetails } from '@services/scores-365';

const validForMinutes = 30;

@Injectable()
export class CompetitionTableCacheService extends BaseCache<CompetitionTableDetails> {
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
