import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { SCORES_365_API_URL } from '../scores-365.config';
import { MatchDetails } from '../interface';

export async function getMatchDetails(matchId: number): Promise<MatchDetails> {
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
