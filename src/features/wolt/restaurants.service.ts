import { Logger } from '@nestjs/common';
import { RestaurantsList, WoltRestaurant } from '@shared/wolt';
import { getRestaurantsList } from './utils';
import { TOO_OLD_LIST_THRESHOLD_MS } from './wolt.config';

let restaurantsList: RestaurantsList = {
  restaurants: [],
  lastUpdated: 0,
};

export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

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
        this.logger.log(`${this.refreshRestaurants.name} - Restaurants list was refreshed successfully`);
      }
    } catch (err) {
      this.logger.error(`${this.refreshRestaurants.name} - error - ${err}`);
    }
  }
}

const restaurantsService = new RestaurantsService();
export { restaurantsService };
