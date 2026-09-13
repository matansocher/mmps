export type WeatherChartPoint = {
  readonly hour: number; // Hour number (0-23)
  readonly temperature: number;
};

export type WeatherChartOptions = {
  readonly points: ReadonlyArray<WeatherChartPoint>;
  readonly title?: string;
  readonly highlightHours?: ReadonlyArray<number>;
};
