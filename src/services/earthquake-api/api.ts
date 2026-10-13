import axios from 'axios';
import { getErrorMessage, Logger, sleep } from '@core/utils';
import type { Earthquake, USGSResponse } from './types';

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const USGS_DAY_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const MIN_MAGNITUDE = 4.0;
const DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const TRANSIENT_ERROR_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'ERR_NETWORK']);
const logger = new Logger('USGS');

type GetEarthquakesOptions = {
  readonly minMagnitude?: number;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly limit?: number;
  readonly orderBy?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
};

export async function getRecentEarthquakes(options: GetEarthquakesOptions = {}): Promise<Earthquake[]> {
  const now = Date.now();
  const { minMagnitude = MIN_MAGNITUDE, startTime = new Date(now - 15 * 60 * 1000), endTime, limit = 100, orderBy = 'time' } = options;

  // USGS recommends summary feeds over custom queries for automated real-time polling.
  if (
    startTime.getTime() >= now - DAY_MS &&
    startTime.getTime() <= now &&
    (!endTime || (endTime.getTime() >= startTime.getTime() && endTime.getTime() <= now)) &&
    Number.isFinite(minMagnitude) &&
    minMagnitude >= -10 &&
    minMagnitude <= 10 &&
    Number.isInteger(limit) &&
    limit > 0 &&
    limit <= 20_000
  ) {
    const data = await getUSGSResponse(USGS_DAY_FEED_URL);
    const end = endTime?.getTime() ?? now;
    const earthquakes = data.features.filter((quake) => {
      const { mag, time } = quake.properties;
      return typeof mag === 'number' && mag >= minMagnitude && time >= startTime.getTime() && time <= end;
    });
    const ascending = orderBy.endsWith('-asc');
    const byMagnitude = orderBy.startsWith('magnitude');
    earthquakes.sort((a, b) => {
      const difference = byMagnitude ? a.properties.mag - b.properties.mag : a.properties.time - b.properties.time;
      return ascending ? difference : -difference;
    });
    return earthquakes.slice(0, limit);
  }

  const params: Record<string, string> = {
    format: 'geojson',
    starttime: startTime.toISOString(),
    minmagnitude: String(minMagnitude),
    orderby: orderBy,
    limit: String(limit),
  };

  if (endTime) {
    params.endtime = endTime.toISOString();
  }

  return (await getUSGSResponse(USGS_BASE_URL, params)).features;
}

async function getUSGSResponse(url: string, params?: Record<string, string>): Promise<USGSResponse> {
  for (let attempt = 0; ; attempt++) {
    const startedAt = Date.now();
    try {
      const response = await axios.get<USGSResponse>(url, { params, timeout: REQUEST_TIMEOUT_MS });
      if (response.status !== 200 || !Array.isArray(response.data?.features)) {
        throw new Error(`Invalid USGS response (status ${response.status}): expected an earthquake feature collection`);
      }
      logger.debug(`Request succeeded in ${Date.now() - startedAt}ms (attempt ${attempt + 1}): ${url}`);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const code = axios.isAxiosError(error) ? error.code : undefined;
      const transient =
        axios.isAxiosError(error) && (status !== undefined ? status === 408 || status === 429 || (status >= 500 && status < 600 && status !== 501) : TRANSIENT_ERROR_CODES.has(code ?? ''));
      const diagnostic = `USGS request failed in ${Date.now() - startedAt}ms (attempt ${attempt + 1}, code ${code ?? 'none'}, status ${status ?? 'none'}): ${url}: ${getErrorMessage(error)}`;
      if (!transient || attempt >= MAX_RETRIES) {
        logger.error(diagnostic);
        throw error;
      }
      const delayMs = 500 * 2 ** attempt;
      logger.warn(`${diagnostic}; retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
}

export async function getEarthquakesAboveMagnitude(minMagnitude: number, hoursBack: number = 24): Promise<Earthquake[]> {
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return getRecentEarthquakes({ minMagnitude, startTime, orderBy: 'magnitude', limit: 50 });
}
