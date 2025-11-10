import axios from 'axios';
import { env } from 'node:process';
import { CurrentWeather, DayForecast, HourlyWeather, TomorrowForecast } from './types';

const baseURL = 'https://api.weatherapi.com/v1';

export async function getTomorrowHourlyForecast(location: string): Promise<TomorrowForecast> {
  const apiKey = env.WEATHERAPI_KEY;
  if (!apiKey) {
    throw new Error('WeatherAPI key not configured');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const response = await axios.get(`${baseURL}/forecast.json`, {
    params: {
      key: apiKey,
      q: location,
      days: 2,
      aqi: 'no',
      alerts: 'no',
    },
  });

  const data = response.data;

  const tomorrowForecast = data.forecast.forecastday.find((day: any) => day.date === tomorrowDateStr);

  if (!tomorrowForecast) {
    throw new Error('Tomorrow forecast not available');
  }

  const hourlyForecast: HourlyWeather[] = tomorrowForecast.hour.map((hour: any) => ({
    time: hour.time,
    hour: new Date(hour.time).getHours(),
    temperature: Math.round(hour.temp_c),
    feelsLike: Math.round(hour.feelslike_c),
    condition: hour.condition.text,
    conditionCode: hour.condition.code,
    humidity: hour.humidity,
    windSpeed: hour.wind_kph,
    chanceOfRain: hour.chance_of_rain,
    willItRain: hour.will_it_rain === 1,
  }));

  return {
    location: `${data.location.name}, ${data.location.country}`,
    coords: {
      lat: data.location.lat,
      lon: data.location.lon,
    },
    date: tomorrowDateStr,
    hourly: hourlyForecast,
  };
}

export async function getSpecificHourWeather(location: string, hour: number): Promise<HourlyWeather | null> {
  const forecast = await getTomorrowHourlyForecast(location);
  return forecast.hourly.find((h) => h.hour === hour) || null;
}

export async function getCurrentWeather(location: string): Promise<CurrentWeather> {
  const apiKey = env.WEATHERAPI_KEY;
  if (!apiKey) {
    throw new Error('WeatherAPI key not configured');
  }

  const response = await axios.get(`${baseURL}/current.json`, {
    params: {
      key: apiKey,
      q: location,
      aqi: 'no',
    },
  });

  const data = response.data;

  return {
    location: `${data.location.name}, ${data.location.country}`,
    coords: {
      lat: data.location.lat,
      lon: data.location.lon,
    },
    temperature: Math.round(data.current.temp_c),
    feelsLike: Math.round(data.current.feelslike_c),
    condition: data.current.condition.text,
    conditionCode: data.current.condition.code,
    humidity: data.current.humidity,
    windSpeed: data.current.wind_kph,
    date: new Date().toISOString(),
  };
}

export async function getForecastWeather(location: string, date: string): Promise<DayForecast> {
  const apiKey = env.WEATHERAPI_KEY;
  if (!apiKey) {
    throw new Error('WeatherAPI key not configured');
  }

  const targetDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    throw new Error('Forecast date must be today or in the future.');
  }

  if (diffDays > 14) {
    throw new Error('Weather forecast is only available up to 14 days in the future');
  }

  const response = await axios.get(`${baseURL}/forecast.json`, {
    params: {
      key: apiKey,
      q: location,
      days: Math.min(diffDays + 1, 14),
      aqi: 'no',
      alerts: 'no',
    },
  });

  const data = response.data;
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const dayForecast = data.forecast.forecastday.find((day: any) => day.date === targetDateStr);

  if (!dayForecast) {
    throw new Error(`Forecast not available for ${targetDateStr}`);
  }

  const dayData = dayForecast.day;

  return {
    location: `${data.location.name}, ${data.location.country}`,
    coords: {
      lat: data.location.lat,
      lon: data.location.lon,
    },
    date: targetDateStr,
    temperature: Math.round(dayData.avgtemp_c),
    temperatureMin: Math.round(dayData.mintemp_c),
    temperatureMax: Math.round(dayData.maxtemp_c),
    feelsLike: Math.round(dayData.avgtemp_c),
    condition: dayData.condition.text,
    conditionCode: dayData.condition.code,
    humidity: dayData.avghumidity,
    windSpeed: dayData.maxwind_kph,
    chanceOfRain: dayData.daily_chance_of_rain,
  };
}
