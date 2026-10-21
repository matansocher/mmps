import { selectWeatherChart } from './weather-chart';

const hourly = (location: string, temps: readonly number[]) => ({
  toolName: 'weather',
  data: { action: 'tomorrow_hourly', location, date: '2026-10-20', hourlyForecast: temps.map((temp, hour) => ({ time: `${hour}:00`, temp: `${temp}°C`, rainChance: `${hour * 10}%` })) },
});

const forecast = (date: string, location = 'Jerusalem') => ({
  toolName: 'weather',
  data: { action: 'forecast', location, date, temperatureMin: '15°C', temperatureMax: '24°C', chanceOfRain: '30%', condition: 'Cloudy' },
});

describe('selectWeatherChart()', () => {
  test('should parse the latest hourly result into numbers', () => {
    const chart = selectWeatherChart([hourly('Haifa', [10, 11]), hourly('Tel Aviv', [20, 21, 22])]);
    expect(chart).toEqual({
      kind: 'hourly',
      data: {
        location: 'Tel Aviv',
        date: '2026-10-20',
        hours: [
          { hour: 0, temperature: 20, chanceOfRain: 0 },
          { hour: 1, temperature: 21, chanceOfRain: 10 },
          { hour: 2, temperature: 22, chanceOfRain: 20 },
        ],
      },
    });
  });

  test('should prefer hourly data over daily forecasts', () => {
    expect(selectWeatherChart([forecast('2026-10-20'), forecast('2026-10-21'), hourly('Tel Aviv', [20, 21])])?.kind).toEqual('hourly');
  });

  test('should build a daily strip from several forecast days of the latest location', () => {
    const chart = selectWeatherChart([forecast('2026-10-20', 'Eilat'), forecast('2026-10-20'), forecast('2026-10-21'), forecast('2026-10-21')]);
    expect(chart?.kind).toEqual('daily');
    expect(chart?.data.location).toEqual('Jerusalem');
    expect(chart?.kind === 'daily' && chart.data.days.map((day) => day.date)).toEqual(['2026-10-20', '2026-10-21']);
  });

  test.each([
    { description: 'only current weather', toolResults: [{ toolName: 'weather', data: { action: 'current', temperature: '20°C' } }] },
    { description: 'a single forecast day', toolResults: [forecast('2026-10-20')] },
    { description: 'a single hourly point', toolResults: [hourly('Tel Aviv', [20])] },
    { description: 'an errored result', toolResults: [{ ...hourly('Tel Aviv', [20, 21]), error: 'boom' }] },
    { description: 'another tool', toolResults: [{ toolName: 'israel_rail', data: { action: 'tomorrow_hourly' } }] },
  ])('should return null for $description', ({ toolResults }) => {
    expect(selectWeatherChart(toolResults)).toBeNull();
  });
});
