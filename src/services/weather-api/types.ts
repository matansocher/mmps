export type HourlyWeather = {
  readonly time: string; // Format: "YYYY-MM-DD HH:MM"
  readonly hour: number; // Hour number (0-23)
  readonly temperature: number;
  readonly feelsLike: number;
  readonly condition: string;
  readonly conditionCode: number; // Weather condition code for emoji mapping
  readonly humidity: number;
  readonly windSpeed: number;
  readonly chanceOfRain: number;
  readonly willItRain: boolean;
};

export type TomorrowForecast = {
  readonly location: string;
  readonly coords: {
    readonly lat: number;
    readonly lon: number;
  };
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly hourly: ReadonlyArray<HourlyWeather>;
};

export type CurrentWeather = {
  readonly location: string;
  readonly coords: {
    readonly lat: number;
    readonly lon: number;
  };
  readonly temperature: number;
  readonly feelsLike: number;
  readonly condition: string;
  readonly conditionCode: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly date: string; // ISO timestamp
};

export type DayForecast = {
  readonly location: string;
  readonly coords: {
    readonly lat: number;
    readonly lon: number;
  };
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly temperature: number;
  readonly temperatureMin: number;
  readonly temperatureMax: number;
  readonly feelsLike: number;
  readonly condition: string;
  readonly conditionCode: number;
  readonly humidity: number;
  readonly windSpeed: number;
  readonly chanceOfRain: number;
};
