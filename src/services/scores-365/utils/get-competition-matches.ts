import axios from 'axios';
import { pick as _pick } from 'lodash';
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
  const enrichedMatches = await Promise.all(matchesRes.map((matchRes: MatchDetails) => getMatchDetails(matchRes.id)));
  const competitionRes = result.data?.competitions[0];
  const competition: Competition = _pick(competitionRes, ['id', 'name']);
  return { competition, matches: enrichedMatches.filter(Boolean).filter((m) => m.gameTime === -1) };
}
