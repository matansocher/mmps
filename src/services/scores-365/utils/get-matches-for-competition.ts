import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateString } from '@core/utils';
import { LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { getMatchDetails } from './get-match-details';
import { Competition, CompetitionDetails, ExpectedMatch, MatchDetails } from '../interface';

export async function getMatchesForCompetition(competition: Competition, date: string): Promise<CompetitionDetails> {
  const queryParams = { competitions: competition.id.toString(), langId: `${LANGUAGE_ID}`, timezoneName: DEFAULT_TIMEZONE };
  const allMatchesRes = await axios.get(`${SCORES_365_API_URL}/games/current?${new URLSearchParams(queryParams)}`);
  const matchesRes = allMatchesRes?.data?.games.filter((matchRes: ExpectedMatch) => date === getDateString(new Date(matchRes.startTime)));
  const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => getMatchDetails(matchRes.id)));
  return { competition, matches: enrichedMatches.filter(Boolean) };
}
