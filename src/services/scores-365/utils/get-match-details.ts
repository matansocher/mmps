import axios from 'axios';
import { pick as _pick } from 'lodash';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { ExpectedMatch, MatchDetails, Team } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

export async function getMatchDetails(matchId: number): Promise<MatchDetails> {
  try {
    const queryParams = {
      appTypeId: `${APP_TYPE_ID}`,
      langId: `${LANGUAGE_ID}`,
      timezoneName: DEFAULT_TIMEZONE,
      gameId: matchId.toString(),
      userCountryId: `${COUNTRY_ID}`,
    };
    const matchRes = await axios.get(`${SCORES_365_API_URL}/game?${new URLSearchParams(queryParams)}`);
    return parseExpectedMatch(matchRes.data?.game);
  } catch {
    return null;
  }
}

function parseExpectedMatch(match: ExpectedMatch): MatchDetails {
  const { id, startTime, statusText, gameTime, venue, stageName: stage, homeCompetitor, awayCompetitor, tvNetworks = [] } = match;
  const channel = tvNetworks[0]?.name;
  const fields = ['id', 'name', 'symbolicName', 'score', 'color'];
  return {
    id,
    startTime,
    statusText,
    gameTime,
    stage,
    venue: venue?.name,
    homeCompetitor: _pick(homeCompetitor, fields) as Team,
    awayCompetitor: _pick(awayCompetitor, fields) as Team,
    ...(channel ? { channel } : {}),
  } as MatchDetails;
}
