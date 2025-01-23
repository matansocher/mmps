import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { RestaurantsList, WoltRestaurant } from './interface';
import {
  CITIES_BASE_URL,
  CITIES_SLUGS_SUPPORTED,
  RESTAURANTS_BASE_URL,
  RESTAURANT_BASE_URL,
  RESTAURANT_LINK_BASE_URL,
  MAX_NUM_OF_RESTAURANTS_TO_SHOW,
} from './wolt-bot.config';

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
      const restaurants = await this.getRestaurantsList();
      if (restaurants.length) {
        this.restaurantsList = { restaurants, lastUpdated: new Date().getTime() };
        this.logger.log(`${this.refreshRestaurants.name} - Restaurants list was refreshed successfully`);
      }
    } catch (err) {
      this.logger.error(`${this.refreshRestaurants.name} - error - ${getErrorMessage(err)}`);
    }
  }

  async getRestaurantsList(): Promise<WoltRestaurant[]> {
    try {
      const cities = await this.getCitiesList();
      const promises = cities.map((city) => {
        const { LAT, LON } = city;
        const url = `${RESTAURANTS_BASE_URL}?lat=${LAT}&lon=${LON}`;
        return axios.get(url);
      });

      const response = await Promise.all(promises);
      const restaurantsWithArea = this.addAreaToRestaurantsFromResponse(response, cities);

      return restaurantsWithArea.map((restaurant) => {
        return {
          id: restaurant.venue.id,
          name: restaurant.title,
          isOnline: restaurant.venue.online,
          slug: restaurant.venue.slug,
          area: restaurant.area,
          photo: restaurant.image.url,
        } as WoltRestaurant;
      });
    } catch (err) {
      this.logger.error(`${this.getRestaurantsList.name} - err - ${getErrorMessage(err)}`);
      return [];
    }
  }

  async getCitiesList(): Promise<{ WOLT_AREA_NAME: string; LON: number; LAT: number }[]> {
    try {
      const result = await axios.get(CITIES_BASE_URL);
      const rawCities = result['data'].results;
      return rawCities
        .filter((city) => CITIES_SLUGS_SUPPORTED.includes(city.slug))
        .map((city) => {
          return {
            WOLT_AREA_NAME: city.slug,
            LON: city.location.coordinates[0],
            LAT: city.location.coordinates[1],
          };
        });
    } catch (err) {
      this.logger.error(`${this.getCitiesList.name} - err - ${getErrorMessage(err)}`);
      return [];
    }
  }

  addAreaToRestaurantsFromResponse(response, cities) {
    return response
      .map((res, index) => {
        const restaurants = res.data.sections[1].items;
        restaurants.map((restaurant) => (restaurant.area = cities[index].WOLT_AREA_NAME));
        return restaurants;
      })
      .flat();
  }

  async enrichRestaurants(parsedRestaurants) {
    try {
      const promises = parsedRestaurants.map((restaurant) => {
        const url = `${RESTAURANT_BASE_URL}`.replace('{slug}', restaurant.slug);
        return axios.get(url);
      });
      const response = await Promise.all(promises);
      const restaurantsRawData = response.map((res) => res.data);
      return restaurantsRawData.map((rawRestaurant) => {
        const relevantParsedRestaurant = parsedRestaurants.find((restaurant) => restaurant.id === rawRestaurant.venue.id);
        const restaurantLinkUrl = this.getRestaurantLink(relevantParsedRestaurant);
        const isOpen = rawRestaurant.venue.open_status.is_open;
        return { ...relevantParsedRestaurant, restaurantLinkUrl, isOpen };
      });
    } catch (err) {
      this.logger.error(`${this.enrichRestaurants.name} - err - ${getErrorMessage(err)}`);
      return parsedRestaurants;
    }
  }

  getRestaurantLink(restaurant: WoltRestaurant): string {
    const { area, slug } = restaurant;
    return RESTAURANT_LINK_BASE_URL.replace('{area}', area).replace('{slug}', slug);
  }

  getRestaurantDetailsByName(restaurantName: string): WoltRestaurant {
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
