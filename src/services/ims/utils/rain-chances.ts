import { fromZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { HourlyRainChance, ImsForecastResponse } from '../types';

const HOUR_MS = 60 * 60 * 1000;

// Hourly rain chances from the start of the current hour through the next `hours` hours
export function extractUpcomingRainChances(response: ImsForecastResponse, now: Date, hours: number): HourlyRainChance[] {
  const from = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const to = now.getTime() + hours * HOUR_MS;

  return Object.values(response?.data ?? {})
    .flatMap((day) => Object.values(day?.hourly ?? {}))
    .map((entry) => ({
      time: fromZonedTime(entry.forecast_time.replace(' ', 'T'), DEFAULT_TIMEZONE),
      hour: entry.forecast_time.slice(11, 16),
      rainChance: Number(entry.rain_chance) || 0,
    }))
    .filter(({ time }) => time.getTime() >= from && time.getTime() <= to)
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}
