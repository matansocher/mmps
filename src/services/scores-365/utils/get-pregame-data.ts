import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

export async function getPregameData(matchId: number) {
  try {
    const queryParams = {
      appTypeId: `${APP_TYPE_ID}`,
      langId: `${LANGUAGE_ID}`,
      timezoneName: DEFAULT_TIMEZONE,
      game: `${matchId}`,
      userCountryId: `${COUNTRY_ID}`,
      onlyMajor: `true`,
      topBookmaker: `1`,
    };
    const response = await axios.get(`${SCORES_365_API_URL}/stats/preGame?${new URLSearchParams(queryParams)}`);
    return response?.data;
  } catch (error) {
    return null;
  }
}
