import axios from 'axios';
import { getErrorMessage, Logger } from '@core/utils';
import { ADSB_FI_BASE_URL, ADSB_LOL_BASE_URL, MAX_RADIUS_NM, REQUEST_TIMEOUT_MS } from './constants';
import type { AdsbAircraft, AdsbFiResponse, AdsbLolResponse, RadiusQuery } from './types';

const logger = new Logger('adsb:api');

async function fetchFromAdsbLol({ lat, lon, radiusNm }: RadiusQuery): Promise<AdsbAircraft[]> {
  const { data } = await axios.get<AdsbLolResponse>(`${ADSB_LOL_BASE_URL}/point/${lat}/${lon}/${radiusNm}`, { timeout: REQUEST_TIMEOUT_MS });
  if (!Array.isArray(data?.ac)) {
    throw new Error('adsb.lol returned an unexpected response');
  }
  return data.ac;
}

async function fetchFromAdsbFi({ lat, lon, radiusNm }: RadiusQuery): Promise<AdsbAircraft[]> {
  const { data } = await axios.get<AdsbFiResponse>(`${ADSB_FI_BASE_URL}/lat/${lat}/lon/${lon}/dist/${radiusNm}`, { timeout: REQUEST_TIMEOUT_MS });
  if (!Array.isArray(data?.aircraft)) {
    throw new Error('adsb.fi returned an unexpected response');
  }
  return data.aircraft;
}

export async function getAircraftInRadius(query: RadiusQuery): Promise<AdsbAircraft[]> {
  const normalized: RadiusQuery = { ...query, radiusNm: Math.min(Math.round(query.radiusNm), MAX_RADIUS_NM) };
  try {
    return await fetchFromAdsbLol(normalized);
  } catch (err) {
    logger.warn(`adsb.lol failed, falling back to adsb.fi: ${getErrorMessage(err)}`);
    return fetchFromAdsbFi(normalized);
  }
}
