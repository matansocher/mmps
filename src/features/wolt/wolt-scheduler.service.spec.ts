import type { Bot } from 'grammy';
import { WoltSchedulerService } from './wolt-scheduler.service';

vi.mock('@shared/wolt', () => ({
  archiveSubscription: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  getExpiredSubscriptions: vi.fn(),
  getUserDetails: vi.fn(),
}));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('./restaurants.service', () => ({ restaurantsService: {} }));

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
