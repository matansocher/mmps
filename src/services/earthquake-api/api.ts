import axios from 'axios';
import { Earthquake, USGSResponse } from './types';

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const MIN_MAGNITUDE = 4.0;

type GetEarthquakesOptions = {
  readonly minMagnitude?: number;
  readonly startTime?: Date;
  readonly endTime?: Date;
  readonly limit?: number;
  readonly orderBy?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
};

export async function getRecentEarthquakes(options: GetEarthquakesOptions = {}): Promise<Earthquake[]> {
  const { minMagnitude = MIN_MAGNITUDE, startTime = new Date(Date.now() - 15 * 60 * 1000), endTime, limit = 100, orderBy = 'time' } = options;

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

  const response = await axios.get<USGSResponse>(USGS_BASE_URL, { params, timeout: 10000 });

  if (response.status !== 200) {
    throw new Error(`USGS API returned status ${response.status}`);
  }

  return response.data.features || [];
}

export async function getEarthquakesAboveMagnitude(minMagnitude: number, hoursBack: number = 24): Promise<Earthquake[]> {
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return getRecentEarthquakes({ minMagnitude, startTime, orderBy: 'magnitude', limit: 50 });
}
