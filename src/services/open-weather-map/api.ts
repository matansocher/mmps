import axios from 'axios';
import { WeatherDetails } from './types';

const baseURL = 'https://api.openweathermap.org/data/2.5/weather';

export async function getWeatherDetails(apiKey: string, location: string): Promise<WeatherDetails> {
  const response = await axios.get(baseURL, {
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
  };
}
