import axios from 'axios';
import { sleep } from '@core/utils';
import { Earthquake, USGSResponse } from './types';

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface GetEarthquakesOptions {
  minMagnitude?: number;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  orderBy?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
}

export async function getRecentEarthquakes(options: GetEarthquakesOptions = {}): Promise<Earthquake[]> {
  const {
    minMagnitude = 4.0,
    startTime = new Date(Date.now() - 10 * 60 * 1000), // Default: 10 minutes ago
    endTime,
    limit = 100,
    orderBy = 'time',
  } = options;

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

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get<USGSResponse>(USGS_BASE_URL, {
        params,
        timeout: 10000, // 10 second timeout
      });

      if (response.status !== 200) {
        throw new Error(`USGS API returned status ${response.status}`);
      }

      return response.data.features || [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
      }
    }
  }

  throw new Error(`Failed to fetch earthquakes after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

export async function getEarthquakesAboveMagnitude(minMagnitude: number, hoursBack: number = 24): Promise<Earthquake[]> {
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  return getRecentEarthquakes({
    minMagnitude,
    startTime,
    orderBy: 'magnitude',
    limit: 50,
  });
}

export function formatEarthquake(quake: Earthquake): string {
  const { properties, geometry } = quake;
  const [longitude, latitude, depth] = geometry.coordinates;

  const severity = getSeverityEmoji(properties.mag);
  const date = new Date(properties.time);
  const depthStr = formatDepth(depth);

  let message = `${severity} *Magnitude ${properties.mag.toFixed(1)}*\n`;
  message += `📍 ${properties.place}\n`;
  message += `🕐 ${date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
  message += `📏 Depth: ${depthStr}\n`;
  message += `🌐 Coordinates: ${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°\n`;

  if (properties.tsunami === 1) {
    message += `🌊 *TSUNAMI WARNING*\n`;
  }

  if (properties.alert) {
    const alertEmoji = getAlertEmoji(properties.alert);
    message += `⚠️  Alert Level: ${alertEmoji} ${properties.alert.toUpperCase()}\n`;
  }

  if (properties.felt !== null && properties.felt !== undefined) {
    message += `👥 Felt by: ${properties.felt} people\n`;
  }

  message += `\n🔗 [Details](${properties.url})`;

  return message;
}

function getSeverityEmoji(magnitude: number): string {
  if (magnitude >= 8.0) return '⚠️'; // Great
  if (magnitude >= 7.0) return '🟣'; // Major
  if (magnitude >= 6.0) return '🔴'; // Strong
  if (magnitude >= 5.0) return '🟠'; // Moderate
  return '🟡'; // Minor
}

function getAlertEmoji(alert: string): string {
  const emojis: Record<string, string> = {
    green: '🟢',
    yellow: '🟡',
    orange: '🟠',
    red: '🔴',
  };
  return emojis[alert] || '⚪';
}

function formatDepth(depth: number): string {
  if (depth < 70) return `${depth.toFixed(1)}km (shallow)`;
  if (depth < 300) return `${depth.toFixed(1)}km (intermediate)`;
  return `${depth.toFixed(1)}km (deep)`;
}
