import { buildWeatherChartImage } from '../../tool-images';
import type { ImagePreview } from './types';

const TEMPS = [17, 16, 16, 15, 15, 15, 16, 18, 20, 22, 24, 25, 26, 26, 25, 24, 23, 21, 20, 19, 18, 18, 17, 17];
const RAIN = [0, 0, 0, 0, 5, 10, 20, 35, 60, 75, 80, 65, 40, 30, 20, 10, 5, 0, 0, 0, 0, 0, 0, 0];

const hourlyResult = {
  toolName: 'weather',
  data: {
    action: 'tomorrow_hourly',
    location: 'Tel Aviv',
    date: '2026-10-20',
    hourlyForecast: TEMPS.map((temp, hour) => ({
      time: `${hour}:00`,
      temp: `${temp}°C`,
      feelsLike: `${temp}°C`,
      condition: 'Partly cloudy',
      humidity: '60%',
      wind: '12 km/h',
      rainChance: `${RAIN[hour]}%`,
    })),
  },
};

const DAYS = [
  { date: '2026-10-20', min: 18, max: 27, rain: 0, condition: 'Sunny' },
  { date: '2026-10-21', min: 19, max: 26, rain: 10, condition: 'Partly cloudy' },
  { date: '2026-10-22', min: 17, max: 23, rain: 70, condition: 'Moderate rain' },
  { date: '2026-10-23', min: 16, max: 21, rain: 85, condition: 'Heavy rain' },
  { date: '2026-10-24', min: 17, max: 24, rain: 30, condition: 'Overcast' },
];
const forecastResults = DAYS.map((day) => ({
  toolName: 'weather',
  data: { action: 'forecast', location: 'Jerusalem', date: day.date, temperatureMin: `${day.min}°C`, temperatureMax: `${day.max}°C`, chanceOfRain: `${day.rain}%`, condition: day.condition },
}));

export const WEATHER_PREVIEWS: readonly ImagePreview[] = [
  { name: 'weather-hourly-he', render: () => buildWeatherChartImage([hourlyResult], 'מחר בתל אביב: 15-26 מעלות, גשם בבוקר') },
  { name: 'weather-hourly-en', render: () => buildWeatherChartImage([hourlyResult], 'Tomorrow in Tel Aviv: 15-26, rain in the morning') },
  { name: 'weather-daily-he', render: () => buildWeatherChartImage(forecastResults, 'תחזית לירושלים לימים הקרובים') },
  { name: 'weather-daily-en', render: () => buildWeatherChartImage(forecastResults, 'Jerusalem forecast for the coming days') },
];
