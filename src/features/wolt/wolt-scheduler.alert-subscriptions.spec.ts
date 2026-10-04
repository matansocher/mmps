import type { Bot } from 'grammy';
import type { Subscription, WoltRestaurant } from '@shared/wolt';
import { restaurantsService } from './restaurants.service';
import { WoltSchedulerService } from './wolt-scheduler.service';

vi.mock('@shared/wolt', () => ({
  archiveSubscription: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  getExpiredSubscriptions: vi.fn(),
  getUserDetails: vi.fn(),
}));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('./restaurants.service', () => ({ restaurantsService: {} }));

function venue(id: string, isOnline: boolean): WoltRestaurant {
  return { id, name: 'Chain', isOnline, link: `https://wolt.com/${id}` } as WoltRestaurant;
}

function subscription(chatId: number, restaurantId?: string): Subscription {
  return { chatId, restaurant: 'Chain', restaurantId } as Subscription;
}

describe('WoltSchedulerService.alertSubscriptions()', () => {
  let scheduler: WoltSchedulerService;
  let alert: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scheduler = new WoltSchedulerService({} as Bot);
    alert = vi.spyOn(scheduler, 'alertSubscription').mockResolvedValue();
  });

  function givenRestaurants(restaurants: WoltRestaurant[]) {
    (restaurantsService as { getRestaurants?: unknown }).getRestaurants = vi.fn().mockResolvedValue(restaurants);
  }

  it('should alert only when the subscribed branch is open', async () => {
    givenRestaurants([venue('tel-aviv', true), venue('haifa', false)]);

    await scheduler.alertSubscriptions([subscription(1, 'haifa'), subscription(2, 'tel-aviv')]);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(venue('tel-aviv', true), subscription(2, 'tel-aviv'));
  });

  it('should alert an old subscription without an id once, even when several branches are open', async () => {
    givenRestaurants([venue('tel-aviv', true), venue('haifa', true)]);

    await scheduler.alertSubscriptions([subscription(1)]);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(venue('tel-aviv', true), subscription(1));
  });

  it('should not alert when the subscribed venue is missing from the list', async () => {
    givenRestaurants([venue('tel-aviv', true)]);

    await scheduler.alertSubscriptions([subscription(1, 'gone')]);

    expect(alert).not.toHaveBeenCalled();
  });
});
