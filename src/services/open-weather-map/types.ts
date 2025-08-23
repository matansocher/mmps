export type WeatherDetails = {
  location: string;
  coords: { lat: number; lon: number };
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  feelsLike: number;
  description: string;
  humidity: number;
};
