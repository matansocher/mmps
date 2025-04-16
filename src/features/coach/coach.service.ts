import { Injectable } from '@nestjs/common';
import { getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { CompetitionTableCacheService, MatchesSummaryCacheService } from './cache';
import { generateMatchResultsString, generateTableString } from './utils';

@Injectable()
export class CoachService {
  constructor(
    private readonly matchesCache: MatchesSummaryCacheService,
    private readonly tablesCache: CompetitionTableCacheService,
  ) {}

  async getMatchesSummaryMessage(date: string): Promise<string> {
    let summaryDetails = this.matchesCache.getMatchesSummary(date);
    if (!summaryDetails?.length) {
      summaryDetails = await getMatchesSummaryDetails(date);
      this.matchesCache.saveMatchesSummary(date, summaryDetails);
    }
    if (!summaryDetails?.length) {
      return null;
    }
    return generateMatchResultsString(summaryDetails);
  }

  async getCompetitionTableMessage(competitionId: number): Promise<string> {
    let competitionTableDetails = this.tablesCache.getCompetitionTable(competitionId);
    if (!competitionTableDetails) {
      competitionTableDetails = await getCompetitionTable(competitionId);
      this.tablesCache.saveCompetitionTable(competitionId, competitionTableDetails);
    }
    if (!competitionTableDetails) {
      return null;
    }
    return generateTableString(competitionTableDetails);
  }
}
