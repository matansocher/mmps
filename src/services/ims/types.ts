export type ImsCurrentAnalysisResponse = {
  readonly data: {
    readonly [locationId: string]: {
      readonly id: string;
      readonly lid: string;
      readonly forecast_time: string;
      readonly temperature: string;
      readonly feels_like: string;
      readonly relative_humidity: string;
      readonly wind_speed: number;
      readonly weather_code: string;
      readonly rain: string;
      readonly rain_chance: string;
      readonly [key: string]: any;
    };
  };
  readonly method: string;
};

export type ImsForecastResponse = {
  readonly data: {
    readonly [date: string]: {
      readonly country: {
        readonly forecast_day: string;
        readonly created: string;
        readonly description: string;
      };
      readonly daily: {
        readonly id: string;
        readonly lid: string;
        readonly forecast_date: string;
        readonly weather_code: string;
        readonly minimum_temperature: string;
        readonly maximum_temperature: string;
        readonly maximum_uvi: string;
        readonly created: string;
      };
      readonly hourly: {
        readonly [hour: string]: {
          readonly lid: string;
          readonly day: string;
          readonly hour: string;
          readonly weather_code: string;
          readonly rain_chance: string;
          readonly forecast_time: string;
          readonly temperature: string;
          readonly precise_temperature: string;
          readonly heat_stress: string;
          readonly relative_humidity: string;
          readonly wind_speed: string;
          readonly wind_chill: string;
          readonly rain: string;
          readonly [key: string]: any;
        };
      };
    };
  };
  readonly method: string;
};
