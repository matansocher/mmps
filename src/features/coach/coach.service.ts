import { Injectable } from '@nestjs/common';
import { generateCompetitionMatchesString, generateMatchResultsString } from '@shared//coach';
import { Competition, CompetitionDetails, getCompetitionMatches, getCompetitions, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { getTableTemplate } from '@services/telegram';
import { competitionMatchesCacheService, competitionsCacheService, competitionTableCacheService, matchesSummaryCacheService } from './cache';

@Injectable()
export class CoachService {
  async getMatchesSummary(date: string): Promise<CompetitionDetails[]> {
    let summaryDetails = matchesSummaryCacheService.getMatchesSummary(date);
    if (!summaryDetails?.length) {
      const competitions = await this.getCompetitions();
      summaryDetails = await getMatchesSummaryDetails(competitions, date);
      summaryDetails?.length && matchesSummaryCacheService.saveMatchesSummary(date, summaryDetails);
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
    let competitionTableDetails = competitionTableCacheService.getCompetitionTable(competitionId);
    if (!competitionTableDetails) {
      competitionTableDetails = await getCompetitionTable(competitionId);
      competitionTableCacheService.saveCompetitionTable(competitionId, competitionTableDetails);
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
    let competitionMatches = competitionMatchesCacheService.getCompetitionMatches(competitionId);
    if (!competitionMatches) {
      competitionMatches = await getCompetitionMatches(competitionId);
      competitionMatchesCacheService.saveCompetitionMatches(competitionId, competitionMatches);
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
    let competitions = competitionsCacheService.getCompetitions();
    if (!competitions) {
      competitions = await getCompetitions();
      competitionsCacheService.saveCompetitions(competitions);
    }
    if (!competitions?.length) {
      return null;
    }
    return competitions;
  }
}
