import axios from 'axios';
import type { CurrentWeather, DayForecast, HourlyWeather, TomorrowForecast } from '@services/weather-api/types';
import { DEFAULT_LANGUAGE, IMS_BASE_URL, IMS_ENDPOINTS } from './constants';
import { getLocationInfo } from './location-mapping';
import type { ImsCurrentAnalysisResponse, ImsForecastResponse } from './types';
import { transformImsCurrentWeather, transformImsDayForecast, transformImsHourlyForecast } from './utils/transform-response';

async function fetchImsCurrentAnalysis(locationId: number): Promise<ImsCurrentAnalysisResponse> {
  const url = `${IMS_BASE_URL}${IMS_ENDPOINTS.currentAnalysis(DEFAULT_LANGUAGE, locationId)}`;

  const response = await axios.get<ImsCurrentAnalysisResponse>(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  return response.data;
}

async function fetchImsForecast(locationId: number): Promise<ImsForecastResponse> {
  const url = `${IMS_BASE_URL}${IMS_ENDPOINTS.forecast(DEFAULT_LANGUAGE, locationId)}`;

  const response = await axios.get<ImsForecastResponse>(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  return response.data;
}

export async function getCurrentWeather(locationId: number): Promise<CurrentWeather> {
  const locationInfo = getLocationInfo(locationId);
  if (!locationInfo) {
    throw new Error(`Unknown location ID: ${locationId}`);
  }

  const imsResponse = await fetchImsCurrentAnalysis(locationId);
  return transformImsCurrentWeather(imsResponse, locationId, locationInfo);
}

export async function getHourlyForecast(locationId: number, daysAhead: number = 0): Promise<TomorrowForecast> {
  const locationInfo = getLocationInfo(locationId);
  if (!locationInfo) {
    throw new Error(`Unknown location ID: ${locationId}`);
  }

  if (daysAhead < 0) {
    throw new Error('daysAhead must be 0 or greater');
  }

  if (daysAhead > 4) {
    throw new Error('IMS forecast is only available up to 5 days in the future (0-4 days ahead)');
  }

  const imsResponse = await fetchImsForecast(locationId);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  return transformImsHourlyForecast(imsResponse, locationInfo, targetDateStr);
}

export async function getTomorrowHourlyForecast(locationId: number): Promise<TomorrowForecast> {
  return getHourlyForecast(locationId, 1);
}

export async function getTodayHourlyForecast(locationId: number): Promise<TomorrowForecast> {
  return getHourlyForecast(locationId, 0);
}

export async function getSpecificHourWeather(locationId: number, hour: number): Promise<HourlyWeather | null> {
  const forecast = await getTomorrowHourlyForecast(locationId);
  return forecast.hourly.find((h) => h.hour === hour) || null;
}

export async function getForecastWeather(locationId: number, date: string): Promise<DayForecast> {
  const locationInfo = getLocationInfo(locationId);
  if (!locationInfo) {
    throw new Error(`Unknown location ID: ${locationId}`);
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    throw new Error('Forecast date must be today or in the future.');
  }

  if (diffDays > 4) {
    throw new Error('IMS forecast is only available up to 5 days in the future');
  }

  const imsResponse = await fetchImsForecast(locationId);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  return transformImsDayForecast(imsResponse, locationInfo, targetDateStr);
}
