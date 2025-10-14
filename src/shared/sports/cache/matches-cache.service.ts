import { BaseCache } from '@core/services';
import { CompetitionDetails } from '@services/scores-365';

const validForMinutes = 10;

export class MatchesSummaryCacheService extends BaseCache<CompetitionDetails[]> {
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

const matchesSummaryCacheService = new MatchesSummaryCacheService();
export { matchesSummaryCacheService };
