import { env } from 'node:process';
import { sleep } from '@core/utils';
import { BOOKING_API_BASE_URL, BOOKING_API_HOST } from '../constants';

export function validateRapidApiKey(): void {
  if (!env.RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY is not configured. Subscribe to booking-com15 at https://rapidapi.com/DataCrawler/api/booking-com15');
  }
}

function getRapidApiHeaders(): Record<string, string> {
  return {
    'x-rapidapi-key': env.RAPIDAPI_KEY,
    'x-rapidapi-host': BOOKING_API_HOST,
  };
}

export async function rapidApiGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  validateRapidApiKey();

  const url = new URL(`${BOOKING_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url.toString(), { method: 'GET', headers: getRapidApiHeaders() });
    const body = await response.text();
    if (response.ok && body) {
      return JSON.parse(body) as T;
    }
    if (attempt === maxAttempts) {
      throw new Error(`${path} failed: HTTP ${response.status} - ${body || '(empty body)'}`);
    }
    await sleep(1500);
  }
  throw new Error(`${path} failed`);
}
