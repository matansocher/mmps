import { Logger } from '@core/utils';
import * as imsApi from '@services/ims';
import * as weatherApi from '@services/weather-api';
import type { CurrentWeather, DayForecast, HourlyWeather, TomorrowForecast } from '@services/weather-api/types';

const logger = new Logger('WeatherService');

export async function getCurrentWeather(location: string): Promise<CurrentWeather> {
  const imsLocationId = imsApi.getImsLocationId(location);

  if (imsLocationId) {
    try {
      logger.log(`Using IMS for ${location} (ID: ${imsLocationId})`);
      return await imsApi.getCurrentWeather(imsLocationId);
    } catch (err) {
      logger.warn(`IMS failed for ${location}: ${err}, falling back to WeatherAPI`);
    }
  }

  logger.log(`Using WeatherAPI for ${location}`);
  return weatherApi.getCurrentWeather(location);
}

export async function getHourlyForecast(location: string, daysAhead: number = 0): Promise<TomorrowForecast> {
  const imsLocationId = imsApi.getImsLocationId(location);

  if (imsLocationId) {
    if (daysAhead > 4) {
      logger.log(`IMS only supports 5-day forecast, using WeatherAPI for ${location} (${daysAhead} days ahead)`);
      return await weatherApi.getHourlyForecast(location, daysAhead);
    }

    try {
      logger.log(`Using IMS for ${location} (ID: ${imsLocationId})`);
      return await imsApi.getHourlyForecast(imsLocationId, daysAhead);
    } catch (err) {
      logger.warn(`IMS failed for ${location}: ${err}, falling back to WeatherAPI`);
    }
  }

  logger.log(`Using WeatherAPI for ${location}`);
  return await weatherApi.getHourlyForecast(location, daysAhead);
}

export async function getTomorrowHourlyForecast(location: string): Promise<TomorrowForecast> {
  return getHourlyForecast(location, 1);
}

export async function getTodayHourlyForecast(location: string): Promise<TomorrowForecast> {
  return getHourlyForecast(location, 0);
}

export async function getSpecificHourWeather(location: string, hour: number): Promise<HourlyWeather | null> {
  const imsLocationId = imsApi.getImsLocationId(location);

  if (imsLocationId) {
    try {
      logger.log(`Using IMS for ${location} (ID: ${imsLocationId})`);
      return await imsApi.getSpecificHourWeather(imsLocationId, hour);
    } catch (err) {
      logger.warn(`IMS failed for ${location}: ${err}, falling back to WeatherAPI`);
    }
  }

  logger.log(`Using WeatherAPI for ${location}`);
  return await weatherApi.getSpecificHourWeather(location, hour);
}

export async function getForecastWeather(location: string, date: string): Promise<DayForecast> {
  const imsLocationId = imsApi.getImsLocationId(location);

  if (imsLocationId) {
    const targetDate = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 4) {
      logger.log(`IMS only supports 5-day forecast, using WeatherAPI for ${location} (${date})`);
      return await weatherApi.getForecastWeather(location, date);
    }

    try {
      logger.log(`Using IMS for ${location} (ID: ${imsLocationId})`);
      return await imsApi.getForecastWeather(imsLocationId, date);
    } catch (err) {
      logger.warn(`IMS failed for ${location}: ${err}, falling back to WeatherAPI`);
    }
  }

  logger.log(`Using WeatherAPI for ${location}`);
  return await weatherApi.getForecastWeather(location, date);
}
