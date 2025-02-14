import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { RestaurantsList, WoltRestaurant } from './interface';
import { getRestaurantsList } from './utils';
import { TOO_OLD_LIST_THRESHOLD_MS } from './wolt-bot.config';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  restaurantsList: RestaurantsList = {
    restaurants: [],
    lastUpdated: 0,
  };

  async getRestaurants(): Promise<WoltRestaurant[]> {
    const { lastUpdated } = this.restaurantsList;
    const isLastUpdatedTooOld = new Date().getTime() - lastUpdated > TOO_OLD_LIST_THRESHOLD_MS;
    if (isLastUpdatedTooOld) {
      await this.refreshRestaurants();
    }
    return this.restaurantsList.restaurants;
  }

  async refreshRestaurants(): Promise<void> {
    try {
      const restaurants = await getRestaurantsList();
      if (restaurants.length) {
        this.restaurantsList = { restaurants, lastUpdated: new Date().getTime() };
        this.logger.log(`${this.refreshRestaurants.name} - Restaurants list was refreshed successfully`);
      }
    } catch (err) {
      this.logger.error(`${this.refreshRestaurants.name} - error - ${getErrorMessage(err)}`);
    }
  }
}
