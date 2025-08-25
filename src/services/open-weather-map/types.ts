export type WeatherDetails = {
  readonly location: string;
  readonly coords: { readonly lat: number; readonly lon: number };
  readonly temperature: number;
  readonly temperatureMin: number;
  readonly temperatureMax: number;
  readonly feelsLike: number;
  readonly description: string;
  readonly humidity: number;
  readonly date: string;
};

export type WeatherForecast = WeatherDetails & {
  readonly isForecast: boolean;
};
