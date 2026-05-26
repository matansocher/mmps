import { BaseCache } from '@core/services';
import { CompetitionDetails } from '@services/scores-365';

const validForMinutes = 10;

export class MatchesSummaryCacheService extends BaseCache<CompetitionDetails[]> {
  constructor() {
    super(validForMinutes, 'sports:summary');
  }

  async getMatchesSummary(date: string): Promise<CompetitionDetails[] | null> {
    return this.getFromCache(date);
  }

  async saveMatchesSummary(date: string, data: CompetitionDetails[]): Promise<void> {
    await this.saveToCache(date, data);
  }
}

const matchesSummaryCacheService = new MatchesSummaryCacheService();
export { matchesSummaryCacheService };
