import { BaseCache } from '@core/services';
import { CompetitionDetails } from '@services/scores-365';

const validForMinutes = 10;

export class CompetitionMatchesCacheService extends BaseCache<CompetitionDetails> {
  constructor() {
    super(validForMinutes, 'sports:competition-matches');
  }

  async getCompetitionMatches(competitionId: number): Promise<CompetitionDetails | null> {
    return this.getFromCache(competitionId.toString());
  }

  async saveCompetitionMatches(competitionId: number, data: CompetitionDetails): Promise<void> {
    await this.saveToCache(competitionId.toString(), data);
  }
}

const competitionMatchesCacheService = new CompetitionMatchesCacheService();
export { competitionMatchesCacheService };
