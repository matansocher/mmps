import { getErrorMessage, Logger } from '@core/utils';
import { RestaurantsList, WoltRestaurant } from '@shared/wolt';
import { getRestaurantsList } from './utils';
import { TOO_OLD_LIST_THRESHOLD_MS } from './wolt.config';

let restaurantsList: RestaurantsList = {
  restaurants: [],
  lastUpdated: 0,
};

export class RestaurantsService {
  private readonly logger = new Logger('wolt:restaurants');

  async getRestaurants(): Promise<WoltRestaurant[]> {
    const { lastUpdated } = restaurantsList;
    const isLastUpdatedTooOld = new Date().getTime() - lastUpdated > TOO_OLD_LIST_THRESHOLD_MS;
    if (isLastUpdatedTooOld) {
      await this.refreshRestaurants();
    }
    return restaurantsList.restaurants;
  }

  async refreshRestaurants(): Promise<void> {
    try {
      const restaurants = await getRestaurantsList();
      if (restaurants.length) {
        restaurantsList = { restaurants, lastUpdated: new Date().getTime() };
      }
    } catch (err) {
      this.logger.error(`Failed to refresh restaurants list: ${getErrorMessage(err)}`);
    }
  }
}

const restaurantsService = new RestaurantsService();
export { restaurantsService };
