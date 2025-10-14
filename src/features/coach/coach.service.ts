import { Injectable } from '@nestjs/common';
import { CompetitionDetails } from '@services/scores-365';
import { getTableTemplate } from '@services/telegram';
import { generateCompetitionMatchesString, generateMatchResultsString, getSportsCompetitionMatches, getSportsCompetitions, getSportsCompetitionTable, getSportsMatchesSummary } from '@shared/sports';

@Injectable()
export class CoachService {
  async getMatchesSummary(date: string): Promise<CompetitionDetails[]> {
    return await getSportsMatchesSummary(date);
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
    const competitionTableDetails = await getSportsCompetitionTable(competitionId);
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
    return await getSportsCompetitionMatches(competitionId);
  }

  async getCompetitionMatchesMessage(competitionId: number): Promise<string> {
    const competitionMatches = await this.getCompetitionMatches(competitionId);
    if (!competitionMatches) {
      return null;
    }
    return generateCompetitionMatchesString(competitionMatches);
  }

  async getCompetitions() {
    return await getSportsCompetitions();
  }
}
