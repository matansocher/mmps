import { Injectable, Logger } from '@nestjs/common';
import { CompetitionDetails, CompetitionTableDetails, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { generateMatchResultsString, generateTableString } from './utils';

const cacheValidForMinutes = 1;

type CompetitionsDetailsCache = {
  readonly lastUpdated: number;
  readonly competitionsDetails: CompetitionDetails[];
};

type CompetitionsTablesCache = {
  readonly lastUpdated: number;
  readonly competitionTableDetails: CompetitionTableDetails;
};

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  private competitionsDetailsCache: Record<string, CompetitionsDetailsCache> = {}; // { date: CompetitionsDetailsCache }
  private competitionsTablesCache: Record<string, CompetitionsTablesCache> = {}; // { competitionId: CompetitionsTablesCache }

  async getMatchesSummaryMessage(date: string): Promise<string> {
    let summaryDetails = this.getMatchesSummaryFromCache(date);
    if (!summaryDetails?.length) {
      summaryDetails = await getMatchesSummaryDetails(date);
      this.saveMatchesSummaryToCache(date, summaryDetails);
    }
    if (!summaryDetails?.length) {
      return null;
    }
    return generateMatchResultsString(summaryDetails);
  }

  private getMatchesSummaryFromCache(date: string): CompetitionDetails[] {
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

  private saveMatchesSummaryToCache(date: string, competitionsDetails: CompetitionDetails[]): void {
    this.competitionsDetailsCache[date] = { competitionsDetails, lastUpdated: new Date().getTime() };
  }

  async getCompetitionTableMessage(competitionId: number): Promise<string> {
    let competitionTableDetails = this.getCompetitionTableFromCache(competitionId);
    if (!competitionTableDetails) {
      competitionTableDetails = await getCompetitionTable(competitionId);
      this.saveCompetitionTableToCache(competitionId, competitionTableDetails);
    }
    if (!competitionTableDetails) {
      return null;
    }
    return generateTableString(competitionTableDetails);
  }

  private getCompetitionTableFromCache(competitionId: number): CompetitionTableDetails {
    const fromCache = this.competitionsTablesCache[competitionId];
    if (!fromCache) {
      return null;
    }

    const isLastUpdatedTooOld = new Date().getTime() - fromCache.lastUpdated > cacheValidForMinutes * 1000 * 60;
    if (isLastUpdatedTooOld) {
      delete this.competitionsTablesCache[competitionId];
      return null;
    }

    return fromCache.competitionTableDetails;
  }

  private saveCompetitionTableToCache(competitionId: number, competitionTableDetails: CompetitionTableDetails): void {
    this.competitionsTablesCache[competitionId] = { competitionTableDetails, lastUpdated: new Date().getTime() };
  }
}
