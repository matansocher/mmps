import axios from 'axios';
import { findBenGurionFlights, parseFlightNumber } from './api';

vi.mock('axios');

describe('parseFlightNumber()', () => {
  test.each([
    { input: 'LY001', expected: { airlineCode: 'LY', number: '1' } },
    { input: 'ly 315', expected: { airlineCode: 'LY', number: '315' } },
    { input: '6H-884', expected: { airlineCode: '6H', number: '884' } },
    { input: 'W6 2812', expected: { airlineCode: 'W6', number: '2812' } },
  ])('should parse $input', ({ input, expected }) => {
    expect(parseFlightNumber(input)).toEqual(expected);
  });

  test.each([{ input: 'El Al' }, { input: '315' }, { input: 'LY12345' }, { input: '' }])('should reject "$input"', ({ input }) => {
    expect(parseFlightNumber(input)).toEqual(null);
  });
});

describe('findBenGurionFlights()', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset();
  });

  it('should query every zero-padding of the flight number and map the records', async () => {
    const record = {
      CHOPER: 'LY',
      CHFLTN: '001',
      CHOPERD: 'EL AL ISRAEL AIRLINES',
      CHSTOL: '2026-05-20T00:40:00',
      CHPTOL: '2026-05-20T01:10:00',
      CHAORD: 'D',
      CHLOC1T: 'NEW YORK',
      CHLOC1TH: 'ניו יורק',
      CHLOCCT: 'UNITED STATES',
      CHLOC1CH: 'ארצות הברית',
      CHTERM: 3,
      CHCINT: '78-99',
      CHCKZN: 'C',
      CHRMINE: 'DELAYED',
      CHRMINH: 'נדחתה',
    };
    vi.mocked(axios.get).mockResolvedValue({ data: { success: true, result: { records: [record] } } });

    const flights = await findBenGurionFlights('LY 1');

    expect(JSON.parse(vi.mocked(axios.get).mock.calls[0][1].params.filters)).toEqual({ CHOPER: 'LY', CHFLTN: ['1', '001', '0001'] });
    expect(flights).toEqual([
      {
        flightNumber: 'LY 001',
        airline: 'EL AL ISRAEL AIRLINES',
        direction: 'departure',
        scheduledTime: '2026-05-20T00:40',
        estimatedTime: '2026-05-20T01:10',
        city: { en: 'NEW YORK', he: 'ניו יורק' },
        country: { en: 'UNITED STATES', he: 'ארצות הברית' },
        terminal: 3,
        status: { en: 'DELAYED', he: 'נדחתה' },
        checkInCounters: '78-99',
        checkInZone: 'C',
      },
    ]);
  });

  it('should return no flights for an invalid flight number without calling the board', async () => {
    expect(await findBenGurionFlights('hello')).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should throw on an unexpected response', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { success: false } });

    await expect(findBenGurionFlights('LY001')).rejects.toThrow();
  });
});
