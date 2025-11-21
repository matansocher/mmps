import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { type Competition, CompetitionDetails, type MatchDetails } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { getMatchDetails } from '../utils';

export async function getCompetitionMatches(competitionId: number): Promise<CompetitionDetails> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    competitions: competitionId.toString(),
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
  };
  const result = await axios.get(`${SCORES_365_API_URL}/games/current?${new URLSearchParams(queryParams)}`);
  const matchesRes = result?.data?.games || [];
  if (!matchesRes?.length) {
    return { competition: null, matches: [] };
  }
  const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => getMatchDetails(matchRes.id)));
  const competitionRes = result.data?.competitions[0];
  const { id, name } = competitionRes;
  const competition: Competition = { id, name };
  return { competition, matches: enrichedMatches.filter(Boolean).filter((m) => m.gameTime === -1) };
}
