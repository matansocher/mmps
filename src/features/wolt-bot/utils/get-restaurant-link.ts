import type { WoltRestaurant } from '../interface';
import { RESTAURANT_LINK_BASE_URL } from '../wolt-bot.config';

export function getRestaurantLink(restaurant: WoltRestaurant): string {
  const { area, slug } = restaurant;
  return RESTAURANT_LINK_BASE_URL.replace('{area}', area).replace('{slug}', slug);
}
