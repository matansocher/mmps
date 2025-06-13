import { Injectable } from '@nestjs/common';
import { Competition, CompetitionDetails, getCompetitionMatches, getCompetitions, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { getTableTemplate } from '@services/telegram';
import { CompetitionMatchesCacheService, CompetitionsCacheService, CompetitionTableCacheService, MatchesSummaryCacheService } from './cache';
import { generateCompetitionMatchesString, generateMatchResultsString } from './utils';

@Injectable()
export class CoachService {
  constructor(
    private readonly competitionsCache: CompetitionsCacheService,
    private readonly summaryCache: MatchesSummaryCacheService,
    private readonly tablesCache: CompetitionTableCacheService,
    private readonly matchesCache: CompetitionMatchesCacheService,
  ) {}

  async getMatchesSummary(date: string): Promise<CompetitionDetails[]> {
    let summaryDetails = this.summaryCache.getMatchesSummary(date);
    if (!summaryDetails?.length) {
      const competitions = await this.getCompetitions();
      summaryDetails = await getMatchesSummaryDetails(competitions, date);
      summaryDetails?.length && this.summaryCache.saveMatchesSummary(date, summaryDetails);
    }
    if (!summaryDetails?.length) {
      return null;
    }
    return summaryDetails;
  }

  async getMatchesSummaryMessage(date: string, competitionIds: number[] = []): Promise<string> {
    const summaryDetails = await this.getMatchesSummary(date);
    if (!summaryDetails) {
      return null;
    }
    const filteredSummaryDetails = !competitionIds.length ? summaryDetails : summaryDetails.filter((summary) => competitionIds.includes(summary.competition.id));
    return generateMatchResultsString(filteredSummaryDetails);
  }

  async getCompetitionTable(competitionId: number): Promise<Array<{ name: string; midValue: number; value: number }>> {
    let competitionTableDetails = this.tablesCache.getCompetitionTable(competitionId);
    if (!competitionTableDetails) {
      competitionTableDetails = await getCompetitionTable(competitionId);
      this.tablesCache.saveCompetitionTable(competitionId, competitionTableDetails);
    }
    if (!competitionTableDetails) {
      return null;
    }

    return competitionTableDetails.competitionTable.map(({ competitor, points, gamesPlayed }) => ({ name: competitor.name, midValue: gamesPlayed, value: points }));
  }

  async getCompetitionTableMessage(competitionId: number): Promise<string> {
    const competitionTableDetails = await this.getCompetitionTable(competitionId);
    if (!competitionTableDetails) {
      return null;
    }
    return getTableTemplate(competitionTableDetails);
  }

  async getCompetitionMatches(competitionId: number): Promise<CompetitionDetails> {
    let competitionMatches = this.matchesCache.getCompetitionMatches(competitionId);
    if (!competitionMatches) {
      competitionMatches = await getCompetitionMatches(competitionId);
      this.matchesCache.saveCompetitionMatches(competitionId, competitionMatches);
    }
    if (!competitionMatches?.matches?.length) {
      return null;
    }
    return competitionMatches;
  }

  async getCompetitionMatchesMessage(competitionId: number): Promise<string> {
    const competitionMatches = await this.getCompetitionMatches(competitionId);
    if (!competitionMatches) {
      return null;
    }
    return generateCompetitionMatchesString(competitionMatches);
  }

  async getCompetitions(): Promise<Competition[]> {
    let competitions = this.competitionsCache.getCompetitions();
    if (!competitions) {
      competitions = await getCompetitions();
      this.competitionsCache.saveCompetitions(competitions);
    }
    if (!competitions?.length) {
      return null;
    }
    return competitions;
  }
}
