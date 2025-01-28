import axios from 'axios';
import { getErrorMessage } from '@core/utils';
import { getRestaurantLink } from './get-restaurant-link';
import { RESTAURANT_BASE_URL } from '../wolt-bot.config';

export async function getEnrichedRestaurantsDetails(parsedRestaurants) {
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
    this.logger.error(`${this.enrichRestaurants.name} - err - ${getErrorMessage(err)}`);
    return parsedRestaurants;
  }
}
