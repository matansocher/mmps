import type { CurrentWeather, DayForecast, HourlyWeather, TomorrowForecast } from '@services/weather-api/types';
import { mapImsCondition } from '../condition-mapping';
import type { LocationMapping } from '../location-mapping';
import type { ImsCurrentAnalysisResponse, ImsForecastResponse } from '../types';

export function transformImsCurrentWeather(imsResponse: ImsCurrentAnalysisResponse, locationId: number, locationInfo: LocationMapping): CurrentWeather {
  const data = imsResponse.data[locationId.toString()];

  if (!data) {
    throw new Error(`No data found for location ID ${locationId}`);
  }

  const { condition, code } = mapImsCondition(data.weather_code);

  return {
    location: locationInfo.nameEn,
    coords: locationInfo.coords,
    temperature: Math.round(parseFloat(data.temperature)),
    feelsLike: Math.round(parseFloat(data.feels_like)),
    condition: condition,
    conditionCode: code,
    humidity: parseInt(data.relative_humidity, 10),
    windSpeed: data.wind_speed,
    chanceOfRain: parseInt(data.rain_chance, 10),
    date: new Date().toISOString(),
  };
}

export function transformImsHourlyForecast(imsResponse: ImsForecastResponse, locationInfo: LocationMapping, targetDate: string): TomorrowForecast {
  const dayData = imsResponse.data[targetDate];

  if (!dayData) {
    throw new Error(`No forecast data for ${targetDate}`);
  }

  if (!dayData.hourly) {
    throw new Error(`No hourly data for ${targetDate}`);
  }

  const hourly: HourlyWeather[] = Object.entries(dayData.hourly).map(([hourStr, data]) => {
    const conditionInfo = mapImsCondition(data.weather_code);

    const hour = parseInt(data.hour, 10);
    const timeStr = `${targetDate} ${hourStr}`;

    const temperature = Math.round(parseFloat(data.temperature));
    const feelsLike = Math.round(parseFloat(data.heat_stress || data.wind_chill || data.temperature));
    const humidity = parseInt(data.relative_humidity, 10);
    const windSpeed = parseFloat(data.wind_speed);

    const chanceOfRain = parseInt(data.rain_chance, 10);
    const rainAmount = parseFloat(data.rain);
    const willItRain = conditionInfo.isRain || chanceOfRain > 50 || rainAmount > 0;

    return {
      time: timeStr,
      hour,
      temperature,
      feelsLike,
      condition: conditionInfo.condition,
      conditionCode: conditionInfo.code,
      humidity,
      windSpeed,
      chanceOfRain,
      willItRain,
    };
  });

  return {
    location: locationInfo.nameEn,
    coords: locationInfo.coords,
    date: targetDate,
    hourly,
  };
}

export function transformImsDayForecast(imsResponse: ImsForecastResponse, locationInfo: LocationMapping, targetDate: string): DayForecast {
  const dayData = imsResponse.data[targetDate];

  if (!dayData) {
    throw new Error(`No forecast data for ${targetDate}`);
  }

  if (!dayData.daily) {
    throw new Error(`No daily data for ${targetDate}`);
  }

  const daily = dayData.daily;
  const conditionInfo = mapImsCondition(daily.weather_code);

  const temperatureMin = parseInt(daily.minimum_temperature, 10);
  const temperatureMax = parseInt(daily.maximum_temperature, 10);
  const temperature = Math.round((temperatureMin + temperatureMax) / 2);

  let chanceOfRain = 0;
  let avgHumidity = 0;
  let maxWindSpeed = 0;

  if (dayData.hourly) {
    const hourlyData = Object.values(dayData.hourly);
    if (hourlyData.length > 0) {
      chanceOfRain = Math.max(...hourlyData.map((h) => parseInt(h.rain_chance, 10)));
      avgHumidity = Math.round(hourlyData.reduce((sum, h) => sum + parseInt(h.relative_humidity, 10), 0) / hourlyData.length);
      maxWindSpeed = Math.max(...hourlyData.map((h) => parseFloat(h.wind_speed)));
    }
  }

  return {
    location: locationInfo.nameEn,
    coords: locationInfo.coords,
    date: targetDate,
    temperature,
    temperatureMin,
    temperatureMax,
    feelsLike: temperature,
    condition: conditionInfo.condition,
    conditionCode: conditionInfo.code,
    humidity: avgHumidity,
    windSpeed: maxWindSpeed,
    chanceOfRain,
  };
}
