import axios from 'axios';
import { env } from 'node:process';
import { WeatherDetails, WeatherForecast } from './types';

const baseURL = 'https://api.openweathermap.org/data/2.5';

export async function getCurrentWeather(location: string): Promise<WeatherDetails> {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }

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
  };
}

export async function getForecastWeather(location: string, date: string): Promise<WeatherForecast> {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    throw new Error("Forecast date must be in the future. Use current weather tool for today's weather.");
  }

  if (diffDays > 5) {
    throw new Error('Weather forecast is only available up to 5 days in the future');
  }

  const response = await axios.get(`${baseURL}/forecast`, {
    params: {
      q: location,
      appid: apiKey,
      units: 'metric',
    },
  });

  const forecasts = response.data.list;

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
