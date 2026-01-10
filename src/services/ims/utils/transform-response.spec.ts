import type { LocationMapping } from '../location-mapping';
import type { ImsCurrentAnalysisResponse, ImsForecastResponse } from '../types';
import { transformImsCurrentWeather, transformImsDayForecast, transformImsHourlyForecast } from './transform-response';

const mockLocationInfo: LocationMapping = {
  id: 2,
  nameEn: 'Tel Aviv - Yafo',
  coords: { lat: 32.0853, lon: 34.7818 },
};

describe('transformImsCurrentWeather', () => {
  const createMockCurrentResponse = (overrides: Record<string, any> = {}): ImsCurrentAnalysisResponse => ({
    data: {
      '2': {
        id: '123',
        lid: '2',
        forecast_time: '2025-01-10T12:00:00',
        temperature: '22.5',
        feels_like: '23.0',
        relative_humidity: '65',
        wind_speed: 15,
        weather_code: '1010',
        rain: '0',
        rain_chance: '10',
        ...overrides,
      },
    },
    method: 'getCurrentAnalysis',
  });

  it('should transform current weather response correctly', () => {
    const response = createMockCurrentResponse();
    const result = transformImsCurrentWeather(response, 2, mockLocationInfo);

    expect(result.location).toBe('Tel Aviv - Yafo');
    expect(result.coords).toEqual({ lat: 32.0853, lon: 34.7818 });
    expect(result.temperature).toBe(23); // rounded from 22.5
    expect(result.feelsLike).toBe(23);
    expect(result.humidity).toBe(65);
    expect(result.windSpeed).toBe(15);
    expect(result.chanceOfRain).toBe(10);
  });

  it('should map Clear condition correctly', () => {
    const response = createMockCurrentResponse({ weather_code: '1010' });
    const result = transformImsCurrentWeather(response, 2, mockLocationInfo);

    expect(result.condition).toBe('Clear');
    expect(result.conditionCode).toBe(1000);
  });

  it('should map Rain condition correctly', () => {
    const response = createMockCurrentResponse({ weather_code: '1160' });
    const result = transformImsCurrentWeather(response, 2, mockLocationInfo);

    expect(result.condition).toBe('Moderate Rain');
    expect(result.conditionCode).toBe(1189);
  });

  it('should throw error for missing location data', () => {
    const response = createMockCurrentResponse();

    expect(() => transformImsCurrentWeather(response, 999, mockLocationInfo)).toThrow('No data found for location ID 999');
  });

  it('should round temperature to nearest integer', () => {
    const response = createMockCurrentResponse({ temperature: '22.7' });
    const result = transformImsCurrentWeather(response, 2, mockLocationInfo);

    expect(result.temperature).toBe(23);
  });

  it('should include date in ISO format', () => {
    const response = createMockCurrentResponse();
    const result = transformImsCurrentWeather(response, 2, mockLocationInfo);

    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('transformImsHourlyForecast', () => {
  const createMockForecastResponse = (targetDate: string): ImsForecastResponse => ({
    data: {
      [targetDate]: {
        country: {
          forecast_day: targetDate,
          created: '2025-01-10T06:00:00',
          description: 'Partly cloudy',
        },
        daily: {
          id: '1',
          lid: '2',
          forecast_date: targetDate,
          weather_code: '1020',
          minimum_temperature: '15',
          maximum_temperature: '25',
          maximum_uvi: '6',
          created: '2025-01-10T06:00:00',
        },
        hourly: {
          '08:00': {
            lid: '2',
            day: targetDate,
            hour: '8',
            weather_code: '1010',
            rain_chance: '5',
            forecast_time: `${targetDate} 08:00`,
            temperature: '18.5',
            precise_temperature: '18.5',
            heat_stress: '19.0',
            relative_humidity: '70',
            wind_speed: '10',
            wind_chill: '17.5',
            rain: '0',
          },
          '12:00': {
            lid: '2',
            day: targetDate,
            hour: '12',
            weather_code: '1020',
            rain_chance: '10',
            forecast_time: `${targetDate} 12:00`,
            temperature: '24.3',
            precise_temperature: '24.3',
            heat_stress: '25.0',
            relative_humidity: '55',
            wind_speed: '15',
            wind_chill: '23.5',
            rain: '0',
          },
        },
      },
    },
    method: 'getForecast',
  });

  it('should transform hourly forecast correctly', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsHourlyForecast(response, mockLocationInfo, targetDate);

    expect(result.location).toBe('Tel Aviv - Yafo');
    expect(result.date).toBe(targetDate);
    expect(result.hourly).toHaveLength(2);
  });

  it('should transform individual hourly data correctly', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsHourlyForecast(response, mockLocationInfo, targetDate);

    const hour8 = result.hourly.find((h) => h.hour === 8);
    expect(hour8).toBeDefined();
    expect(hour8!.temperature).toBe(19); // rounded
    expect(hour8!.feelsLike).toBe(19); // uses heat_stress
    expect(hour8!.humidity).toBe(70);
    expect(hour8!.windSpeed).toBe(10);
    expect(hour8!.chanceOfRain).toBe(5);
  });

  it('should throw error for missing date data', () => {
    const response = createMockForecastResponse('2025-01-11');

    expect(() => transformImsHourlyForecast(response, mockLocationInfo, '2025-01-15')).toThrow('No forecast data for 2025-01-15');
  });

  it('should throw error for missing hourly data', () => {
    const response: ImsForecastResponse = {
      data: {
        '2025-01-11': {
          country: { forecast_day: '2025-01-11', created: '', description: '' },
          daily: { id: '1', lid: '2', forecast_date: '2025-01-11', weather_code: '1010', minimum_temperature: '15', maximum_temperature: '25', maximum_uvi: '5', created: '' },
          hourly: null as any,
        },
      },
      method: 'getForecast',
    };

    expect(() => transformImsHourlyForecast(response, mockLocationInfo, '2025-01-11')).toThrow('No hourly data for 2025-01-11');
  });

  it('should set willItRain based on condition, rain chance, or rain amount', () => {
    const targetDate = '2025-01-11';
    const response: ImsForecastResponse = {
      data: {
        [targetDate]: {
          country: {
            forecast_day: targetDate,
            created: '2025-01-10T06:00:00',
            description: 'Rainy',
          },
          daily: {
            id: '1',
            lid: '2',
            forecast_date: targetDate,
            weather_code: '1160',
            minimum_temperature: '15',
            maximum_temperature: '25',
            maximum_uvi: '6',
            created: '2025-01-10T06:00:00',
          },
          hourly: {
            '08:00': {
              lid: '2',
              day: targetDate,
              hour: '8',
              weather_code: '1160', // Moderate Rain
              rain_chance: '80',
              forecast_time: `${targetDate} 08:00`,
              temperature: '18.5',
              precise_temperature: '18.5',
              heat_stress: '19.0',
              relative_humidity: '70',
              wind_speed: '10',
              wind_chill: '17.5',
              rain: '5',
            },
          },
        },
      },
      method: 'getForecast',
    };

    const result = transformImsHourlyForecast(response, mockLocationInfo, targetDate);
    const hour8 = result.hourly.find((h) => h.hour === 8);

    expect(hour8!.willItRain).toBe(true);
  });
});

describe('transformImsDayForecast', () => {
  const createMockForecastResponse = (targetDate: string): ImsForecastResponse => ({
    data: {
      [targetDate]: {
        country: {
          forecast_day: targetDate,
          created: '2025-01-10T06:00:00',
          description: 'Partly cloudy',
        },
        daily: {
          id: '1',
          lid: '2',
          forecast_date: targetDate,
          weather_code: '1020',
          minimum_temperature: '15',
          maximum_temperature: '25',
          maximum_uvi: '6',
          created: '2025-01-10T06:00:00',
        },
        hourly: {
          '08:00': {
            lid: '2',
            day: targetDate,
            hour: '8',
            weather_code: '1010',
            rain_chance: '5',
            forecast_time: `${targetDate} 08:00`,
            temperature: '18',
            precise_temperature: '18',
            heat_stress: '19',
            relative_humidity: '70',
            wind_speed: '10',
            wind_chill: '17',
            rain: '0',
          },
          '14:00': {
            lid: '2',
            day: targetDate,
            hour: '14',
            weather_code: '1020',
            rain_chance: '20',
            forecast_time: `${targetDate} 14:00`,
            temperature: '24',
            precise_temperature: '24',
            heat_stress: '25',
            relative_humidity: '50',
            wind_speed: '20',
            wind_chill: '23',
            rain: '0',
          },
        },
      },
    },
    method: 'getForecast',
  });

  it('should transform daily forecast correctly', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsDayForecast(response, mockLocationInfo, targetDate);

    expect(result.location).toBe('Tel Aviv - Yafo');
    expect(result.date).toBe(targetDate);
    expect(result.temperatureMin).toBe(15);
    expect(result.temperatureMax).toBe(25);
    expect(result.temperature).toBe(20); // average of min and max
  });

  it('should calculate max chance of rain from hourly data', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsDayForecast(response, mockLocationInfo, targetDate);

    // Max of 5% and 20%
    expect(result.chanceOfRain).toBe(20);
  });

  it('should calculate average humidity from hourly data', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsDayForecast(response, mockLocationInfo, targetDate);

    // Average of 70 and 50
    expect(result.humidity).toBe(60);
  });

  it('should calculate max wind speed from hourly data', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsDayForecast(response, mockLocationInfo, targetDate);

    // Max of 10 and 20
    expect(result.windSpeed).toBe(20);
  });

  it('should throw error for missing daily data', () => {
    const response: ImsForecastResponse = {
      data: {
        '2025-01-11': {
          country: { forecast_day: '2025-01-11', created: '', description: '' },
          daily: null as any,
          hourly: {},
        },
      },
      method: 'getForecast',
    };

    expect(() => transformImsDayForecast(response, mockLocationInfo, '2025-01-11')).toThrow('No daily data for 2025-01-11');
  });

  it('should map condition from daily weather code', () => {
    const targetDate = '2025-01-11';
    const response = createMockForecastResponse(targetDate);
    const result = transformImsDayForecast(response, mockLocationInfo, targetDate);

    expect(result.condition).toBe('Partly Cloudy');
    expect(result.conditionCode).toBe(1003);
  });
});
