import { Injectable } from '@nestjs/common';
import { getCompetitionMatches, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { getTableTemplate } from '@services/telegram';
import { CompetitionMatchesCacheService, CompetitionTableCacheService, MatchesSummaryCacheService } from './cache';
import { generateCompetitionMatchesString, generateMatchResultsString } from './utils';

@Injectable()
export class CoachService {
  constructor(
    private readonly summaryCache: MatchesSummaryCacheService,
    private readonly tablesCache: CompetitionTableCacheService,
    private readonly matchesCache: CompetitionMatchesCacheService,
  ) {}

  async getMatchesSummaryMessage(date: string): Promise<string> {
    let summaryDetails = this.summaryCache.getMatchesSummary(date);
    if (!summaryDetails?.length) {
      summaryDetails = await getMatchesSummaryDetails(date);
      this.summaryCache.saveMatchesSummary(date, summaryDetails);
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

    const tableData = competitionTableDetails.competitionTable.map(({ competitor, points }) => ({ name: competitor.name, value: points }));
    return getTableTemplate(tableData);
  }

  async getCompetitionMatchesMessage(competitionId: number): Promise<string> {
    let competitionMatches = this.matchesCache.getCompetitionMatches(competitionId);
    if (!competitionMatches) {
      competitionMatches = await getCompetitionMatches(competitionId);
      this.matchesCache.saveCompetitionMatches(competitionId, competitionMatches);
    }
    if (!competitionMatches) {
      return null;
    }
    return generateCompetitionMatchesString(competitionMatches);
  }
}
