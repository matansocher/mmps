import { getErrorMessage, Logger } from '@core/utils';
import { RestaurantsList, WoltRestaurant } from '@shared/wolt';
import { getRestaurantsList } from './utils';
import { STALE_LIST_MAX_AGE_MS, TOO_OLD_LIST_THRESHOLD_MS } from './wolt.config';

let restaurantsList: RestaurantsList = {
  restaurants: [],
  lastUpdated: 0,
};

type GetRestaurantsOptions = {
  readonly allowStale?: boolean; // answer from a list up to STALE_LIST_MAX_AGE_MS old and refresh it in the background
};

export class RestaurantsService {
  private readonly logger = new Logger('wolt:restaurants');
  private refreshPromise: Promise<void> | null = null;

  async getRestaurants({ allowStale = false }: GetRestaurantsOptions = {}): Promise<WoltRestaurant[]> {
    const age = Date.now() - restaurantsList.lastUpdated;
    if (age > TOO_OLD_LIST_THRESHOLD_MS) {
      const refresh = this.refreshOnce();
      if (!allowStale || age > STALE_LIST_MAX_AGE_MS) {
        await refresh;
      }
    }
    return restaurantsList.restaurants;
  }

  // a full refresh takes tens of seconds, so concurrent callers share the one in flight instead of starting their own
  private refreshOnce(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshRestaurants().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  async refreshRestaurants(): Promise<void> {
    try {
      const { restaurants, failedAreas } = await getRestaurantsList();
      if (restaurants.length) {
        // an area that failed this time keeps its previous restaurants rather than disappearing until the next refresh
        const failedAreasSet = new Set(failedAreas);
        const keptRestaurants = restaurantsList.restaurants.filter((r) => failedAreasSet.has(r.area));
        restaurantsList = { restaurants: [...restaurants, ...keptRestaurants], lastUpdated: Date.now() };
      }
    } catch (err) {
      this.logger.error(`Failed to refresh restaurants list: ${getErrorMessage(err)}`);
    }
  }
}

const restaurantsService = new RestaurantsService();
export { restaurantsService };
