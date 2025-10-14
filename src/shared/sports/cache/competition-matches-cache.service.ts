import { BaseCache } from '@core/services';
import { CompetitionDetails } from '@services/scores-365';

const validForMinutes = 10;

export class CompetitionMatchesCacheService extends BaseCache<CompetitionDetails> {
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

const competitionMatchesCacheService = new CompetitionMatchesCacheService();
export { competitionMatchesCacheService };
