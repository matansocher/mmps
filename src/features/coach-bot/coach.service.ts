import { Injectable, Logger } from '@nestjs/common';
import { getCompetitions, getMatchesForCompetition } from '@services/scores-365';
import { generateMatchResultsString } from './utils/generate-match-details-string';
import { getDateString, isDateStringFormat } from '@core/utils';
import { CompetitionDetails } from '@services/scores-365/interface';

const cacheValidForMinutes = 5;

interface CompetitionsDetailsCache {
  readonly competitionsDetails: CompetitionDetails[];
  readonly lastUpdated: number;
}

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  private competitionsDetailsCache: Record<string, CompetitionsDetailsCache> = {};

  async getMatchesSummaryMessage(dateString?: string): Promise<string> {
    const date = isDateStringFormat(dateString) ? dateString : getDateString();
    let summaryDetails = this.getMatchesSummaryFromCache(date);
    if (!summaryDetails?.length) {
      summaryDetails = await this.getMatchesSummaryDetails(date);
      this.saveMatchesSummaryToCache(date, summaryDetails);
    }
    if (!summaryDetails?.length) {
      return 'וואלה לא מצאתי משחקים ליום הזה, יש מצב שאין היום משחקים בכלל?';
    }
    return generateMatchResultsString(summaryDetails);
  }

  async getMatchesSummaryDetails(dateString: string): Promise<CompetitionDetails[]> {
    const competitions = await getCompetitions();
    if (!competitions?.length) {
      this.logger.error(`${this.getMatchesSummaryMessage.name} - error - could not get competitions`);
      return;
    }
    const competitionsWithMatches = await Promise.all(competitions.map((competition) => getMatchesForCompetition(competition, dateString)));
    if (!competitionsWithMatches?.length) {
      this.logger.error(`${this.getMatchesSummaryMessage.name} - error - could not get matches`);
      return;
    }

    const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
    if (!competitionsWithMatchesFiltered?.length) {
      this.logger.log(`${this.getMatchesSummaryMessage.name} - no competitions with matches found`);
      return [];
    }

    return competitionsWithMatchesFiltered;
  }

  getMatchesSummaryFromCache(date: string): CompetitionDetails[] {
    const fromCache = this.competitionsDetailsCache[date];
    if (!fromCache) {
      return null;
    }

    const isLastUpdatedTooOld = new Date().getTime() - fromCache.lastUpdated > cacheValidForMinutes * 1000 * 60;
    if (isLastUpdatedTooOld) {
      delete this.competitionsDetailsCache[date];
      return null;
    }

    return fromCache.competitionsDetails;
  }

  saveMatchesSummaryToCache(date: string, competitionsDetails: CompetitionDetails[]): void {
    if (!competitionsDetails?.length) {
      return;
    }
    this.competitionsDetailsCache[date] = {
      competitionsDetails: competitionsDetails,
      lastUpdated: new Date().getTime(),
    };
  }
}
