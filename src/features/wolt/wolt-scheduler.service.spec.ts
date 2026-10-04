import { type Bot, GrammyError } from 'grammy';
import { notify } from '@services/notifier';
import { archiveSubscription, getSubscriptionById, getUserDetails, type Subscription, type WoltRestaurant } from '@shared/wolt';
import { expectLogs } from '@test/expect-logs';
import { WoltSchedulerService } from './wolt-scheduler.service';

vi.mock('@shared/wolt', () => ({
  archiveSubscription: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  getExpiredSubscriptions: vi.fn(),
  getSubscriptionById: vi.fn(),
  getUserDetails: vi.fn(),
}));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('./restaurants.service', () => ({ restaurantsService: {} }));

describe('WoltSchedulerService.cleanSubscription()', () => {
  const subscription = { _id: { toString: () => 'sub-1' }, chatId: 123, restaurant: 'Pizza Place' } as unknown as Subscription;
  let sendMessage: ReturnType<typeof vi.fn>;
  let scheduler: WoltSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(archiveSubscription).mockResolvedValue(true);
    vi.useFakeTimers();
    sendMessage = vi.fn().mockResolvedValue({});
    scheduler = new WoltSchedulerService({ api: { sendMessage } } as unknown as Bot);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.each([
    { time: '2024-01-01T10:00:00Z', hour: 12, silent: false },
    { time: '2024-01-01T22:30:00Z', hour: 0, silent: false },
    { time: '2024-01-01T00:00:00Z', hour: 2, silent: true },
    { time: '2024-01-01T05:59:00Z', hour: 7, silent: true },
  ])('should archive and tell the user (silent=$silent) at $hour:00 Israel time', async ({ time, silent }) => {
    vi.setSystemTime(new Date(time));

    await scheduler.cleanSubscription(subscription);

    expect(archiveSubscription).toHaveBeenCalledWith(subscription._id, false);
    expect(sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Pizza Place'), expect.objectContaining({ disable_notification: silent }));
  });

  it('should not tell the user when the subscription was already removed or alerted', async () => {
    vi.mocked(archiveSubscription).mockResolvedValue(false);

    await scheduler.cleanSubscription(subscription);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should offer buttons to extend the subscription', async () => {
    await scheduler.cleanSubscription(subscription);

    const { reply_markup } = sendMessage.mock.calls[0][2];
    const buttons = reply_markup.inline_keyboard.flat();
    expect(buttons.map((b) => b.callback_data)).toEqual(['extend - sub-1 - 1', 'extend - sub-1 - 4']);
    expect(buttons.map((b) => b.text)).toEqual(['⏳ עוד שעה', '⏳ עוד 4 שעות']);
  });

  it('should contain a failed analytics user lookup', async () => {
    expectLogs('error', 'Failed to notify subscription expiry for chatId 123: mongo down');
    vi.mocked(getUserDetails).mockRejectedValueOnce(new Error('mongo down'));
    const onUnhandled = vi.fn<(reason: unknown) => void>();
    process.on('unhandledRejection', onUnhandled);

    await scheduler.cleanSubscription(subscription);
    await vi.advanceTimersByTimeAsync(0);

    process.off('unhandledRejection', onUnhandled);
    expect(getUserDetails).toHaveBeenCalledWith(123);
    expect(onUnhandled).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});

describe('WoltSchedulerService.scheduleInterval()', () => {
  let scheduler: WoltSchedulerService;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new WoltSchedulerService({} as Bot);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it('should keep the loop alive when the interval flow fails', async () => {
    expectLogs('error', 'Error in interval flow: mongo down', 'Error in interval flow: mongo down');
    const flow = vi.spyOn(scheduler, 'handleIntervalFlow').mockRejectedValue(new Error('mongo down'));

    await expect(scheduler.scheduleInterval()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toEqual(1);

    await vi.runOnlyPendingTimersAsync();
    expect(flow).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toEqual(1);
  });

  it('should not re-arm after stop()', async () => {
    const flow = vi.spyOn(scheduler, 'handleIntervalFlow').mockResolvedValue();

    await scheduler.scheduleInterval();
    scheduler.stop();
    expect(vi.getTimerCount()).toEqual(0);

    await scheduler.scheduleInterval();
    expect(flow).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toEqual(0);
  });
});

describe('WoltSchedulerService.alertSubscription()', () => {
  const restaurant = { name: 'Pizza Place', link: 'https://wolt.com/pizza-place' } as WoltRestaurant;
  const subscription = { _id: { toString: () => 'sub-1' }, chatId: 123, restaurant: 'Pizza Place', restaurantPhoto: 'https://photo.jpg' } as unknown as Subscription;
  const blockedError = new GrammyError('Forbidden: bot was blocked by the user', { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 'sendPhoto', {});
  let api: { sendPhoto: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> };
  let scheduler: WoltSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSubscriptionById).mockResolvedValue({ ...subscription, isActive: true });
    api = { sendPhoto: vi.fn().mockResolvedValue({}), sendMessage: vi.fn().mockResolvedValue({}) };
    scheduler = new WoltSchedulerService({ api } as unknown as Bot);
  });

  it('should archive the subscription as fulfilled after alerting', async () => {
    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendPhoto).toHaveBeenCalledTimes(1);
    expect(archiveSubscription).toHaveBeenCalledWith(subscription._id, true);
  });

  test.each([
    { case: 'removed', current: { ...subscription, isActive: false } },
    { case: 'deleted', current: null },
  ])('should not alert when the subscription was $case after it was read', async ({ current }) => {
    vi.mocked(getSubscriptionById).mockResolvedValue(current);

    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendPhoto).not.toHaveBeenCalled();
    expect(archiveSubscription).not.toHaveBeenCalled();
  });

  it('should add the rating, delivery time and price line to the alert', async () => {
    await scheduler.alertSubscription({ ...restaurant, rating: 8, estimateRange: '15-25', priceRange: 2 }, subscription);

    expect(api.sendPhoto.mock.calls[0][2].caption).toEqual(['מצאתי מסעדה שנפתחה! 🍔🍕🍣', 'Pizza Place', '⭐ 8.0 · 🕒 15-25 דק׳ · ₪₪', 'אפשר להזמין עכשיו! 📱'].join('\n'));
  });

  it('should skip the details line when nothing is known', async () => {
    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendPhoto.mock.calls[0][2].caption).toEqual(['מצאתי מסעדה שנפתחה! 🍔🍕🍣', 'Pizza Place', 'אפשר להזמין עכשיו! 📱'].join('\n'));
  });

  it('should fall back to a text message without notifying when the photo fails', async () => {
    expectLogs('warn', 'Failed to send alert photo for chatId 123, retrying without photo: wrong file identifier');
    api.sendPhoto.mockRejectedValue(new Error('wrong file identifier'));

    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(archiveSubscription).toHaveBeenCalledWith(subscription._id, true);
    expect(notify).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'ALERT_SUBSCRIPTION_FAILED' }));
  });

  it('should archive without retrying when the user blocked the bot', async () => {
    expectLogs('warn', `Archiving subscription for chatId 123, the user blocked the bot: ${blockedError.message}`);
    api.sendPhoto.mockRejectedValue(blockedError);

    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(archiveSubscription).toHaveBeenCalledWith(subscription._id, false);
    expect(notify).not.toHaveBeenCalled();
  });

  it('should keep the subscription for the next tick on other errors', async () => {
    expectLogs('warn', 'Failed to send alert photo for chatId 123, retrying without photo: photo failed');
    expectLogs('error', 'Failed to alert subscription for chatId 123: network down');
    api.sendPhoto.mockRejectedValue(new Error('photo failed'));
    api.sendMessage.mockRejectedValue(new Error('network down'));

    await scheduler.alertSubscription(restaurant, subscription);

    expect(archiveSubscription).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
