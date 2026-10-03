import { type Bot, GrammyError } from 'grammy';
import { notify } from '@services/notifier';
import { archiveSubscription, type Subscription, type WoltRestaurant } from '@shared/wolt';
import { WoltSchedulerService } from './wolt-scheduler.service';

vi.mock('@shared/wolt', () => ({
  archiveSubscription: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  getExpiredSubscriptions: vi.fn(),
  getUserDetails: vi.fn(),
}));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('./restaurants.service', () => ({ restaurantsService: {} }));

describe('WoltSchedulerService.cleanSubscription()', () => {
  const subscription = { chatId: 123, restaurant: 'Pizza Place' } as Subscription;
  let sendMessage: ReturnType<typeof vi.fn>;
  let scheduler: WoltSchedulerService;

  beforeEach(() => {
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

    expect(archiveSubscription).toHaveBeenCalledWith(123, 'Pizza Place', false);
    expect(sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('Pizza Place'), { disable_notification: silent });
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
  const subscription = { chatId: 123, restaurant: 'Pizza Place', restaurantPhoto: 'https://photo.jpg' } as Subscription;
  const blockedError = new GrammyError('Forbidden: bot was blocked by the user', { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 'sendPhoto', {});
  let api: { sendPhoto: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> };
  let scheduler: WoltSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    api = { sendPhoto: vi.fn().mockResolvedValue({}), sendMessage: vi.fn().mockResolvedValue({}) };
    scheduler = new WoltSchedulerService({ api } as unknown as Bot);
  });

  it('should archive the subscription as fulfilled after alerting', async () => {
    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendPhoto).toHaveBeenCalledTimes(1);
    expect(archiveSubscription).toHaveBeenCalledWith(123, 'Pizza Place', true);
  });

  it('should fall back to a text message without notifying when the photo fails', async () => {
    api.sendPhoto.mockRejectedValue(new Error('wrong file identifier'));

    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(archiveSubscription).toHaveBeenCalledWith(123, 'Pizza Place', true);
    expect(notify).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'ALERT_SUBSCRIPTION_FAILED' }));
  });

  it('should archive without retrying when the user blocked the bot', async () => {
    api.sendPhoto.mockRejectedValue(blockedError);

    await scheduler.alertSubscription(restaurant, subscription);

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(archiveSubscription).toHaveBeenCalledWith(123, 'Pizza Place', false);
    expect(notify).not.toHaveBeenCalled();
  });

  it('should keep the subscription for the next tick on other errors', async () => {
    api.sendPhoto.mockRejectedValue(new Error('photo failed'));
    api.sendMessage.mockRejectedValue(new Error('network down'));

    await scheduler.alertSubscription(restaurant, subscription);

    expect(archiveSubscription).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
