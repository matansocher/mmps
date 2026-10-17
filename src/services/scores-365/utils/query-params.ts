import { DEFAULT_TIMEZONE } from '@core/config';
import { APP_TYPE_ID, COUNTRY_ID, ENGLISH_LANGUAGE_ID } from '../scores-365.config';

export function scoresQueryParams(params: Record<string, string>, langId: number = ENGLISH_LANGUAGE_ID): URLSearchParams {
  return new URLSearchParams({ appTypeId: `${APP_TYPE_ID}`, langId: `${langId}`, timezoneName: DEFAULT_TIMEZONE, userCountryId: `${COUNTRY_ID}`, ...params });
}
