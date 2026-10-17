import { DEFAULT_TIMEZONE } from '@core/config';
import { APP_TYPE_ID, COUNTRY_ID, ENGLISH_LANGUAGE_ID } from '../scores-365.config';

export function englishQueryParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams({ appTypeId: `${APP_TYPE_ID}`, langId: `${ENGLISH_LANGUAGE_ID}`, timezoneName: DEFAULT_TIMEZONE, userCountryId: `${COUNTRY_ID}`, ...params });
}
