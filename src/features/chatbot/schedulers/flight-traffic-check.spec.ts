import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getSamplesForHour, getTrafficState, sampleCountryTraffic, saveSample, setTrafficState } from '@shared/flight-traffic';
import { getAllCountries } from '@shared/worldly';
import { flightTrafficCheck } from './flight-traffic-check';

vi.mock('@shared/flight-traffic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/flight-traffic')>()),
  sampleCountryTraffic: vi.fn(),
  getSamplesForHour: vi.fn(),
  getTrafficState: vi.fn(),
  saveSample: vi.fn(),
  setTrafficState: vi.fn(),
}));

vi.mock('@shared/worldly', () => ({ getAllCountries: vi.fn() }));

const sendMessage = vi.fn();
const bot = { api: { sendMessage } } as unknown as Bot;

const NOW = new Date('2026-06-13T10:05:00Z');
const geometry = { type: 'Polygon', coordinates: [] };
const history = Array.from({ length: 10 }, () => ({ insideCount: 40, outsideCount: 60 }));

function mockSnapshots(byCountry: Record<string, { insideCount: number; outsideCount: number } | Error>) {
  vi.mocked(sampleCountryTraffic).mockImplementation(async ({ alpha2 }) => {
    const value = byCountry[alpha2];
    if (value instanceof Error) throw value;
    return { ...value, callsigns: value.insideCount ? ['ELY001'] : [] };
  });
}

describe('flightTrafficCheck()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllCountries).mockResolvedValue([
      { alpha2: 'IL', geometry },
      { alpha2: 'IR', geometry },
    ] as never);
    vi.mocked(getSamplesForHour).mockResolvedValue(history as never);
    vi.mocked(getTrafficState).mockResolvedValue(null);
  });

  it('should store a sample per country and stay silent when traffic is normal', async () => {
    mockSnapshots({ IL: { insideCount: 38, outsideCount: 60 }, IR: { insideCount: 42, outsideCount: 58 } });

    await flightTrafficCheck(bot, NOW);

    expect(saveSample).toHaveBeenCalledTimes(2);
    expect(saveSample).toHaveBeenCalledWith({ countryAlpha2: 'IL', utcHour: 10, insideCount: 38, outsideCount: 60, sampledAt: NOW });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(setTrafficState).not.toHaveBeenCalled();
  });

  it('should alert once when a country enters low traffic', async () => {
    mockSnapshots({ IL: { insideCount: 38, outsideCount: 60 }, IR: { insideCount: 0, outsideCount: 55 } });

    await flightTrafficCheck(bot, NOW);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = sendMessage.mock.calls[0];
    expect(chatId).toEqual(MY_USER_ID);
    expect(text).toContain('No flights at all over 🇮🇷 Iran');
    expect(text).toContain('typical for this hour: 40, -100%');
    expect(text).toContain('Neighbouring airspace looks normal');
    expect(setTrafficState).toHaveBeenCalledWith('IR', true, NOW);
  });

  it('should not alert again while traffic stays low', async () => {
    mockSnapshots({ IL: { insideCount: 38, outsideCount: 60 }, IR: { insideCount: 2, outsideCount: 55 } });
    vi.mocked(getTrafficState).mockImplementation(async (alpha2) => (alpha2 === 'IR' ? { _id: 'IR', isLowTraffic: true, lowSince: NOW, updatedAt: NOW } : null));

    await flightTrafficCheck(bot, NOW);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(setTrafficState).not.toHaveBeenCalled();
  });

  it('should send a recovery message when traffic comes back', async () => {
    mockSnapshots({ IL: { insideCount: 30, outsideCount: 60 }, IR: { insideCount: 42, outsideCount: 58 } });
    const lowSince = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    vi.mocked(getTrafficState).mockImplementation(async (alpha2) => (alpha2 === 'IL' ? { _id: 'IL', isLowTraffic: true, lowSince, updatedAt: lowSince } : null));

    await flightTrafficCheck(bot, NOW);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][1]).toContain('Air traffic over 🇮🇱 Israel is back to normal');
    expect(sendMessage.mock.calls[0][1]).toContain('lasted about 6h');
    expect(setTrafficState).toHaveBeenCalledWith('IL', false, null);
  });

  it('should keep checking the other country when one fails, without storing a sample for it', async () => {
    mockSnapshots({ IL: new Error('adsb down'), IR: { insideCount: 0, outsideCount: 55 } });

    await flightTrafficCheck(bot, NOW);

    expect(saveSample).toHaveBeenCalledTimes(1);
    expect(saveSample).toHaveBeenCalledWith(expect.objectContaining({ countryAlpha2: 'IR' }));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('should skip a country with no border geometry', async () => {
    vi.mocked(getAllCountries).mockResolvedValue([{ alpha2: 'IR', geometry }] as never);
    mockSnapshots({ IR: { insideCount: 42, outsideCount: 58 } });

    await flightTrafficCheck(bot, NOW);

    expect(sampleCountryTraffic).toHaveBeenCalledTimes(1);
  });
});
