import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateString } from '@core/utils';
import type { Competition, CompetitionDetails, ExpectedMatch, MatchDetails } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { getMatchDetails } from './get-match-details';

export async function getMatchesForCompetition(competition: Competition, date: string): Promise<CompetitionDetails> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    competitions: competition.id.toString(),
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
  };
  const allMatchesRes = await axios.get(`${SCORES_365_API_URL}/games/current?${new URLSearchParams(queryParams)}`);
  // const allMatchesRes = await axios.get(`${SCORES_365_API_URL}/games/fixtures?${new URLSearchParams(queryParams)}`);
  const matchesRes = allMatchesRes?.data?.games?.filter((matchRes: ExpectedMatch) => date === getDateString(new Date(matchRes.startTime))) || [];
  const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => getMatchDetails(matchRes.id)));
  return { competition, matches: enrichedMatches.filter(Boolean) };
}
