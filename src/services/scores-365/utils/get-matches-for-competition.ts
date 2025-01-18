import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateString } from '@core/utils';
import { SCORES_365_API_URL } from '../scores-365.config';
import { Competition, ExpectedMatch, MatchDetails } from '../interface';

interface ReturnType {
  readonly competition: Competition;
  readonly matches: MatchDetails[];
}

export async function getMatchesForCompetition(competition: Competition, date: string): Promise<ReturnType> {
  const queryParams = { competitions: competition.id.toString(), langId: '2', timezoneName: DEFAULT_TIMEZONE };
  const allMatchesRes = await axios.get(`${SCORES_365_API_URL}/games/current?${new URLSearchParams(queryParams)}`);
  const matchesRes = allMatchesRes?.data?.games.filter((matchRes: ExpectedMatch) => date === getDateString(new Date(matchRes.startTime)));
  const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => this.getMatchDetails(matchRes.id)));
  return { competition, matches: enrichedMatches.filter(Boolean) };
}
