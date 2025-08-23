import axios from 'axios';
import { env } from 'node:process';
import { WeatherDetails } from './types';

const baseURL = 'https://api.openweathermap.org/data/2.5';

export async function getWeatherDetails(location: string, date?: string): Promise<WeatherDetails> {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  // If no date specified, return current weather
  if (!date) {
    return getCurrentWeather(location, apiKey);
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 5) {
    // Future date - use 5-day forecast
    return getForecastWeather(location, apiKey, diffDays, targetDate);
  } else if (diffDays < 0) {
    // Past date - not supported with free API
    throw new Error('Historical weather data is not available with the current API plan. Only current weather and up to 5-day forecasts are supported.');
  } else if (diffDays > 5) {
    throw new Error('Weather forecast is only available up to 5 days in the future');
  }

  return getCurrentWeather(location, apiKey);
}

async function getCurrentWeather(location: string, apiKey: string): Promise<WeatherDetails> {
  const response = await axios.get(`${baseURL}/weather`, {
    params: {
      q: location,
      appid: apiKey,
      units: 'metric',
    },
  });

  const data = response.data;

  return {
    location: `${data.name}, ${data.sys.country}`,
    coords: data.coord,
    temperature: Math.round(data.main.temp),
    temperatureMin: Math.round(data.main.temp_min),
    temperatureMax: Math.round(data.main.temp_max),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    humidity: data.main.humidity,
    date: new Date().toISOString(),
    isForecast: false,
  };
}

async function getForecastWeather(location: string, apiKey: string, daysAhead: number, targetDate: Date): Promise<WeatherDetails> {
  const response = await axios.get(`${baseURL}/forecast`, {
    params: {
      q: location,
      appid: apiKey,
      units: 'metric',
    },
  });

  const forecasts = response.data.list;

  // Find the forecast closest to the target date
  // OpenWeatherMap forecast API returns data in 3-hour intervals
  const targetTimestamp = targetDate.getTime();
  let closestForecast = forecasts[0];
  let smallestDiff = Math.abs(new Date(forecasts[0].dt * 1000).getTime() - targetTimestamp);

  for (const forecast of forecasts) {
    const forecastTime = new Date(forecast.dt * 1000).getTime();
    const diff = Math.abs(forecastTime - targetTimestamp);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestForecast = forecast;
    }
  }

  return {
    location: `${response.data.city.name}, ${response.data.city.country}`,
    coords: response.data.city.coord,
    temperature: Math.round(closestForecast.main.temp),
    temperatureMin: Math.round(closestForecast.main.temp_min),
    temperatureMax: Math.round(closestForecast.main.temp_max),
    feelsLike: Math.round(closestForecast.main.feels_like),
    description: closestForecast.weather[0].description,
    humidity: closestForecast.main.humidity,
    date: new Date(closestForecast.dt * 1000).toISOString(),
    isForecast: true,
  };
}
