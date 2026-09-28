import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deliverDueReminders, reminderDue, reminderLocalTime, reminderSchema } from './reminder.service';

const mocks = vi.hoisted(() => ({ find: vi.fn(), claim: vi.fn(), update: vi.fn(), player: vi.fn(), send: vi.fn() }));
vi.mock('@core/mongo', () => ({ getMongoCollection: () => ({ find: mocks.find, findOneAndUpdate: mocks.claim, updateOne: mocks.update }) }));
vi.mock('./mongo', () => ({ getPlayer: mocks.player }));
vi.mock('@services/telegram', () => ({ sendMiniAppReminder: mocks.send }));

vi.mock('@core/utils', () => ({
  Logger: class {
    warn() {}
    error() {}
  },
}));

const reminder = { _id: 1, enabled: true, time: '09:00', timezone: 'Asia/Jerusalem' };
describe('optional daily reminders', () => {
  it('validates a real zone and local reminder time', () => {
    expect(reminderSchema.safeParse(reminder).success).toBe(true);
    expect(reminderSchema.safeParse({ ...reminder, time: '25:00' }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...reminder, timezone: 'made/up' }).success).toBe(false);
  });
  it('uses player local time and a short catch-up window', () => {
    expect(reminderDue(reminder, new Date('2026-09-28T06:00:00Z'))).toBe('2026-09-28');
    expect(reminderDue(reminder, new Date('2026-09-28T06:06:00Z'))).toBeNull();
  });
  it('does not send when disabled or already claimed for this date', () => {
    const now = new Date('2026-09-28T06:00:00Z');
    expect(reminderDue({ ...reminder, enabled: false }, now)).toBeNull();
    expect(reminderDue({ ...reminder, lastDay: '2026-09-28' }, now)).toBeNull();
  });
  it('handles daylight-saving offset changes with calendar dates', () => {
    expect(reminderLocalTime(new Date('2026-01-28T07:00:00Z'), 'Asia/Jerusalem')).toEqual({ day: '2026-01-28', minutes: 540 });
    expect(reminderLocalTime(new Date('2026-07-28T06:00:00Z'), 'Asia/Jerusalem')).toEqual({ day: '2026-07-28', minutes: 540 });
  });
});

describe('reminder delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MINDLOOP_APP_URL', 'https://example.com/mindloop/');
    vi.stubEnv('MINDLOOP_TELEGRAM_BOT_TOKEN', 'test-token');
    mocks.find.mockReturnValue([reminder]);
    mocks.player.mockResolvedValue(null);
    mocks.send.mockResolvedValue(undefined);
    let claimed = false;
    mocks.claim.mockImplementation(async () => {
      if (claimed) return null;
      claimed = true;
      return reminder;
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  const now = new Date('2026-09-28T06:00:00Z');
  it('sends only once across overlapping scans', async () => {
    await Promise.all([deliverDueReminders(now), deliverDueReminders(now)]);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send.mock.calls[0][2]).toContain('source=reminder');
  });
  it('skips a completed daily loop', async () => {
    mocks.player.mockResolvedValue({ progress: { sources: { phone: { games: { 'grid-recall': 3 }, days: { '2026-09-28': 3 } } }, awards: {}, records: {} } });
    await deliverDueReminders(now);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('honors opt-out between scan and claim', async () => {
    mocks.claim.mockResolvedValue(null);
    await deliverDueReminders(now);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('does not retry an ambiguous delivery failure that day', async () => {
    mocks.send.mockRejectedValue(new Error('network timeout'));
    await deliverDueReminders(now);
    await deliverDueReminders(now);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('disables reminders when Telegram rejects access', async () => {
    mocks.send.mockRejectedValue({ error_code: 403 });
    await deliverDueReminders(now);
    expect(mocks.update).toHaveBeenCalledWith({ _id: 1 }, { $set: { enabled: false } });
  });
});
