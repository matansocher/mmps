import axios from 'axios';
import { pick as _pick } from 'lodash';
import { Injectable } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { Competition, ExpectedMatch, MatchDetails, Team } from './interface';
import { SCORES_365_API_URL, COMPETITION_IDS } from './scores-365.config';

@Injectable()
export class Scores365Service {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getCompetitions(): Promise<Competition[]> {
    const results = await Promise.all(
      COMPETITION_IDS.map(async (competitionId) => {
        const queryParams = { competitions: competitionId.toString(), langId: '2', timezoneName: DEFAULT_TIMEZONE };
        const result = await axios.get(`${SCORES_365_API_URL}/competitions?${new URLSearchParams(queryParams)}`);
        const relevantCompetition = result.data?.competitions?.find((c) => c.id === competitionId);
        return relevantCompetition ? (_pick(relevantCompetition, ['id', 'name', 'shortName', 'nameForURL']) as Competition) : undefined;
      }),
    );
    return results.filter(Boolean);
  }

  async getMatchesForCompetition(competition: Competition, date: string): Promise<{ competition: Competition; matches: MatchDetails[] }> {
    const queryParams = { competitions: competition.id.toString(), langId: '2', timezoneName: DEFAULT_TIMEZONE };
    const allMatchesRes = await axios.get(`${SCORES_365_API_URL}/games/current?${new URLSearchParams(queryParams)}`);
    const matches = allMatchesRes?.data?.games
      ?.filter((match: ExpectedMatch) => date === this.utilsService.getDateString(new Date(match.startTime)))
      .map((match: ExpectedMatch) => this.parseExpectedMatch(match));
    return { competition, matches };
  }

  parseExpectedMatch(match: ExpectedMatch): MatchDetails {
    const { id, startTime, statusText, gameTime, venue, homeCompetitor, awayCompetitor } = match;
    return {
      id,
      startTime,
      statusText,
      gameTime,
      venue: venue?.name,
      homeCompetitor: _pick(homeCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
      awayCompetitor: _pick(awayCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
    } as MatchDetails;
  }
}
