import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getUpcomingRainChances, type HourlyRainChance } from '@services/ims';
import { generateRainRadarAnimation, type RainRadarAnimation } from '@services/rain-radar';

vi.mock('@services/ims', () => ({ getUpcomingRainChances: vi.fn() }));
vi.mock('@services/rain-radar', () => ({ generateRainRadarAnimation: vi.fn(), IMS_RADAR_PAGE_URL: 'https://ims.gov.il/he/RadarSatellite' }));

const sendAnimation = vi.fn();
const sendPhoto = vi.fn();
const sendMessage = vi.fn();
const bot = { api: { sendAnimation, sendPhoto, sendMessage } } as unknown as Bot;

const NOW = new Date('2026-01-10T12:10:00Z');
const HOUR_MS = 60 * 60 * 1000;

function chances(values: number[]): HourlyRainChance[] {
  return values.map((rainChance, i) => ({ time: new Date(NOW.getTime() + i * HOUR_MS), hour: `${14 + i}:00`, rainChance }));
}

const radar: RainRadarAnimation = {
  gif: Buffer.from('gif'),
  latestFrame: Buffer.from('png'),
  source: 'IMSRadar',
  latestTime: '2026-01-10 14:05:00',
  latestStatus: 0,
  frameCount: 13,
};

async function loadAlert() {
  vi.resetModules();
  return import('./rain-radar-alert');
}

describe('rainRadarAlert()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateRainRadarAnimation).mockResolvedValue(radar);
  });

  test.each([{ values: [0, 10, 20] }, { values: [30, 30, 30] }, { values: [] }])('should not alert when the max chance is not above 30% ($values)', async ({ values }) => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances(values));
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);

    expect(generateRainRadarAnimation).not.toHaveBeenCalled();
    expect(sendAnimation).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should send the radar animation with the hourly chances when rain is expected', async () => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances([10, 31, 70]));
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);

    expect(getUpcomingRainChances).toHaveBeenCalledWith(16, 3, NOW);
    expect(generateRainRadarAnimation).toHaveBeenCalledWith({ marker: expect.objectContaining({ lat: 32.1742, lon: 34.9076 }) });
    expect(sendAnimation).toHaveBeenCalledTimes(1);
    const [chatId, , { caption }] = sendAnimation.mock.calls[0];
    expect(chatId).toEqual(MY_USER_ID);
    expect(caption).toContain('▫️ 14:00 - 10%');
    expect(caption).toContain('☔️ 15:00 - 31%');
    expect(caption).toContain('☔️ 16:00 - 70%');
    expect(caption).toContain('עד 14:05');
    expect(caption).toContain('https://ims.gov.il/he/RadarSatellite');
  });

  it('should fall back to a still image when the animation fails to send', async () => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances([80]));
    sendAnimation.mockRejectedValueOnce(new Error('too big'));
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);

    expect(sendPhoto).toHaveBeenCalledTimes(1);
    expect(sendPhoto.mock.calls[0][0]).toEqual(MY_USER_ID);
  });

  it('should send a text alert when the radar is unavailable', async () => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances([80]));
    vi.mocked(generateRainRadarAnimation).mockRejectedValue(new Error('IMS down'));
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);

    expect(sendAnimation).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(MY_USER_ID, expect.stringContaining('לא הצלחתי להביא את תמונת המכ״ם'));
  });

  it('should not alert again within 3 hours of the previous alert', async () => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances([80]));
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);
    await rainRadarAlert(bot, new Date(NOW.getTime() + 2.5 * HOUR_MS));
    await rainRadarAlert(bot, new Date(NOW.getTime() + 3 * HOUR_MS));

    expect(sendAnimation).toHaveBeenCalledTimes(2);
    expect(getUpcomingRainChances).toHaveBeenCalledTimes(2);
  });

  it('should mention when the radar sees no active clouds', async () => {
    vi.mocked(getUpcomingRainChances).mockResolvedValue(chances([80]));
    vi.mocked(generateRainRadarAnimation).mockResolvedValue({ ...radar, latestStatus: 1 });
    const { rainRadarAlert } = await loadAlert();

    await rainRadarAlert(bot, NOW);

    expect(sendAnimation.mock.calls[0][2].caption).toContain('המכ״ם לא מזהה כרגע עננות פעילה');
  });
});
