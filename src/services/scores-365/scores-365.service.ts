import axios from 'axios';
import { pick as _pick } from 'lodash';
import { Injectable } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateString } from '@core/utils';
import { Competition, ExpectedMatch, MatchDetails, Team } from './interface';
import { SCORES_365_API_URL, COMPETITIONS } from './scores-365.config';

@Injectable()
export class Scores365Service {
  async getCompetitions(): Promise<Competition[]> {
    const competitionIds = COMPETITIONS.map((c) => c.id);
    const results = await Promise.all(
      competitionIds.map(async (competitionId) => {
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
    const matchesRes = allMatchesRes?.data?.games.filter((matchRes: ExpectedMatch) => date === getDateString(new Date(matchRes.startTime)));
    const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => this.getMatchDetails(matchRes.id)));
    return { competition, matches: enrichedMatches.filter(Boolean) };
  }

  async getMatchDetails(matchId: number): Promise<MatchDetails> {
    try {
      const queryParams = {
        appTypeId: '5',
        langId: '2',
        timezoneName: DEFAULT_TIMEZONE,
        gameId: matchId.toString(),
        userCountryId: '6',
      };
      const matchRes = await axios.get(`${SCORES_365_API_URL}/game?${new URLSearchParams(queryParams)}`);
      return this.parseExpectedMatch(matchRes.data?.game);
    } catch (err) {
      return null;
    }
  }

  parseExpectedMatch(match: ExpectedMatch): MatchDetails {
    const { id, startTime, statusText, gameTime, venue, homeCompetitor, awayCompetitor, tvNetworks = [] } = match;
    const channel = tvNetworks[0]?.name;
    return {
      id,
      startTime,
      statusText,
      gameTime,
      venue: venue?.name,
      homeCompetitor: _pick(homeCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
      awayCompetitor: _pick(awayCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
      ...(channel ? { channel } : {}),
    } as MatchDetails;
  }
}
