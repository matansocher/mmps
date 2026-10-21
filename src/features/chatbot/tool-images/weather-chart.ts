import { generateDailyForecastImage, generateHourlyChartImage } from '@services/weather';
import type { DailyForecastData, DailyForecastDay, HourlyChartData } from '@services/weather';
import { detectLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

const WEATHER_TOOL_NAME = 'weather';
const MIN_HOURLY_POINTS = 2;
const MIN_FORECAST_DAYS = 2;

export type WeatherChart = { readonly kind: 'hourly'; readonly data: HourlyChartData } | { readonly kind: 'daily'; readonly data: DailyForecastData };

// Tool values are formatted strings like "23°C" or "40%".
function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toHourlyChart(data: any): HourlyChartData | null {
  if (!Array.isArray(data?.hourlyForecast)) return null;
  const hours = data.hourlyForecast
    .map((entry) => ({ hour: toNumber(String(entry?.time ?? '').split(':')[0]), temperature: toNumber(entry?.temp), chanceOfRain: toNumber(entry?.rainChance) ?? 0 }))
    .filter((point) => point.hour !== null && point.temperature !== null);
  return hours.length >= MIN_HOURLY_POINTS ? { location: data.location, date: data.date, hours } : null;
}

function toForecastDay(data: any): DailyForecastDay | null {
  const temperatureMin = toNumber(data?.temperatureMin);
  const temperatureMax = toNumber(data?.temperatureMax);
  if (data?.action !== 'forecast' || !data.date || temperatureMin === null || temperatureMax === null) return null;
  return { date: data.date, temperatureMin, temperatureMax, chanceOfRain: toNumber(data.chanceOfRain) ?? 0, condition: String(data.condition ?? '') };
}

// Prefers the latest hourly result; otherwise builds a daily strip when the agent fetched several days for the same location.
export function selectWeatherChart(toolResults: readonly ToolResult[]): WeatherChart | null {
  const results = toolResults.filter((result) => result.toolName === WEATHER_TOOL_NAME && !result.error);

  const hourlyResult = [...results].reverse().find((result) => result.data?.action === 'tomorrow_hourly');
  const hourly = hourlyResult ? toHourlyChart(hourlyResult.data) : null;
  if (hourly) {
    return { kind: 'hourly', data: hourly };
  }

  const forecasts = results.filter((result) => result.data?.action === 'forecast');
  const location = forecasts[forecasts.length - 1]?.data?.location;
  const daysByDate = new Map<string, DailyForecastDay>();
  for (const result of forecasts) {
    if (result.data.location !== location) continue;
    const day = toForecastDay(result.data);
    if (day) daysByDate.set(day.date, day);
  }
  if (daysByDate.size < MIN_FORECAST_DAYS) {
    return null;
  }
  return { kind: 'daily', data: { location, days: [...daysByDate.values()] } };
}

export function buildWeatherChartImage(toolResults: readonly ToolResult[], replyText: string): Buffer | null {
  const chart = selectWeatherChart(toolResults);
  if (!chart) {
    return null;
  }
  const language = detectLanguage(replyText);
  return chart.kind === 'hourly' ? generateHourlyChartImage(chart.data, language) : generateDailyForecastImage(chart.data, language);
}

export const WEATHER_CHART_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: WEATHER_TOOL_NAME,
  fileName: 'weather-chart.png',
  build: buildWeatherChartImage,
};
