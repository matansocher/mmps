import axios from 'axios';
import { Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { RESTAURANT_BASE_URL } from '../wolt-bot.config';
import { getRestaurantLink } from './get-restaurant-link';

export async function getEnrichedRestaurantsDetails(parsedRestaurants) {
  const logger = new Logger(getEnrichedRestaurantsDetails.name);
  try {
    const responses = await Promise.all(
      parsedRestaurants.map((restaurant) => {
        const url = RESTAURANT_BASE_URL.replace('{slug}', restaurant.slug);
        return axios.get(url);
      }),
    );
    const restaurantsRawData = responses.map((res) => res.data);
    return restaurantsRawData.map((rawRestaurant) => {
      const relevantParsedRestaurant = parsedRestaurants.find((restaurant) => restaurant.id === rawRestaurant.venue.id);
      const restaurantLinkUrl = getRestaurantLink(relevantParsedRestaurant);
      const isOpen = rawRestaurant.venue.open_status.is_open;
      return { ...relevantParsedRestaurant, restaurantLinkUrl, isOpen };
    });
  } catch (err) {
    logger.error(`err - ${getErrorMessage(err)}`);
    return parsedRestaurants;
  }
}
