import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { IRestaurantsList, IWoltRestaurant } from './interface';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANTS_BASE_URL, RESTAURANT_BASE_URL, RESTAURANT_LINK_BASE_URL } from './wolt.config';

@Injectable()
export class WoltService {
  restaurantsList: IRestaurantsList = {
    restaurants: [],
    lastUpdated: 0,
  };

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  getRestaurants(): IWoltRestaurant[] {
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
        this.logger.info(this.refreshRestaurants.name, 'Restaurants list was refreshed successfully');
      }
    } catch (err) {
      this.logger.error(this.refreshRestaurants.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async getRestaurantsList(): Promise<IWoltRestaurant[]> {
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
        } as IWoltRestaurant;
      });
    } catch (err) {
      this.logger.error(this.getRestaurantsList.name, `err - ${this.utilsService.getErrorMessage(err)}`);
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
      this.logger.error(this.getCitiesList.name, `err - ${this.utilsService.getErrorMessage(err)}`);
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
      this.logger.error(this.enrichRestaurants.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      return parsedRestaurants;
    }
  }

  getRestaurantLink(restaurant): string {
    const { area, slug } = restaurant;
    return RESTAURANT_LINK_BASE_URL.replace('{area}', area).replace('{slug}', slug);
  }
}
