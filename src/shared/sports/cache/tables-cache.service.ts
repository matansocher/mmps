import { BaseCache } from '@core/services';
import { CompetitionTableDetails } from '@services/scores-365';

const validForMinutes = 60;

export class CompetitionTableCacheService extends BaseCache<CompetitionTableDetails> {
  constructor() {
    super(validForMinutes, 'sports:tables');
  }

  async getCompetitionTable(competitionId: number): Promise<CompetitionTableDetails | null> {
    return this.getFromCache(competitionId.toString());
  }

  async saveCompetitionTable(competitionId: number, data: CompetitionTableDetails): Promise<void> {
    await this.saveToCache(competitionId.toString(), data);
  }
}

const competitionTableCacheService = new CompetitionTableCacheService();
export { competitionTableCacheService };
