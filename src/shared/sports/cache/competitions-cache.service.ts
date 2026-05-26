import { BaseCache } from '@core/services';
import { Competition } from '@services/scores-365';

const validForMinutes = 200;

export class CompetitionsCacheService extends BaseCache<Competition[]> {
  private readonly key = 'all';

  constructor() {
    super(validForMinutes, 'sports:competitions');
  }

  async getCompetitions(): Promise<Competition[] | null> {
    return this.getFromCache(this.key);
  }

  async saveCompetitions(data: Competition[]): Promise<void> {
    await this.saveToCache(this.key, data);
  }
}

const competitionsCacheService = new CompetitionsCacheService();
export { competitionsCacheService };
