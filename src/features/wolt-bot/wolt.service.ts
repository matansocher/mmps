import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { RestaurantsList, WoltRestaurant } from './interface';
import { getRestaurantsList } from './utils';
import { CITIES_SLUGS_SUPPORTED, MAX_NUM_OF_RESTAURANTS_TO_SHOW } from './wolt-bot.config';

@Injectable()
export class WoltService {
  private readonly logger = new Logger(WoltService.name);

  restaurantsList: RestaurantsList = {
    restaurants: [],
    lastUpdated: 0,
  };

  getRestaurants(): WoltRestaurant[] {
    return this.restaurantsList.restaurants;
  }

  getLastUpdated(): number {
    return this.restaurantsList.lastUpdated;
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

  getRestaurantDetailsByName(restaurantName: string): WoltRestaurant | null {
    return this.getRestaurants().find((r: WoltRestaurant): boolean => r.name === restaurantName) || null;
  }

  getFilteredRestaurantsByName(searchInput: string): WoltRestaurant[] {
    const restaurants = [...this.getRestaurants()];
    return restaurants
      .filter((restaurant: WoltRestaurant) => {
        return restaurant.name.toLowerCase().includes(searchInput.toLowerCase());
      })
      .sort((a: WoltRestaurant, b: WoltRestaurant) => {
        // sort by the order of areas in CITIES_SLUGS_SUPPORTED
        return CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area);
      })
      .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW);
  }
}
