import type { ImsForecastResponse } from '../types';
import { extractUpcomingRainChances } from './rain-chances';

function forecast(days: Record<string, Record<string, number>>): ImsForecastResponse {
  const data = Object.fromEntries(
    Object.entries(days).map(([day, hours]) => [
      day,
      { hourly: Object.fromEntries(Object.entries(hours).map(([hour, rainChance]) => [hour, { forecast_time: `${day} ${hour}:00`, rain_chance: String(rainChance) }])) },
    ]),
  );
  return { data, method: 'full_forecast_data' } as unknown as ImsForecastResponse;
}

describe('extractUpcomingRainChances()', () => {
  it('should return the current hour and the next hours in Israel time', () => {
    const response = forecast({ '2026-01-10': { '13:00': 90, '14:00': 10, '15:00': 40, '16:00': 60, '17:00': 70, '18:00': 80 } });
    const now = new Date('2026-01-10T12:20:00Z'); // 14:20 in Israel (UTC+2)

    expect(extractUpcomingRainChances(response, now, 3).map(({ hour, rainChance }) => ({ hour, rainChance }))).toEqual([
      { hour: '14:00', rainChance: 10 },
      { hour: '15:00', rainChance: 40 },
      { hour: '16:00', rainChance: 60 },
      { hour: '17:00', rainChance: 70 },
    ]);
  });

  it('should continue into the next day', () => {
    const response = forecast({ '2026-09-26': { '22:00': 0, '23:00': 20 }, '2026-09-27': { '00:00': 50, '01:00': 60 } });
    const now = new Date('2026-09-26T19:10:00Z'); // 22:10 in Israel (UTC+3)

    const result = extractUpcomingRainChances(response, now, 2);

    expect(result.map(({ hour }) => hour)).toEqual(['22:00', '23:00', '00:00']);
    expect(result[2].time).toEqual(new Date('2026-09-26T21:00:00Z'));
  });

  it('should treat missing rain chances as 0', () => {
    const response = forecast({ '2026-09-26': { '15:00': Number.NaN } });

    expect(extractUpcomingRainChances(response, new Date('2026-09-26T12:00:00Z'), 1)[0].rainChance).toEqual(0);
  });
});
