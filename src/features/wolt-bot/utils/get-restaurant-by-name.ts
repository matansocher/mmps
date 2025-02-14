import type { WoltRestaurant } from '../interface';

export function getRestaurantByName(restaurants: WoltRestaurant[], restaurantName: string): WoltRestaurant {
  return restaurants.find((r: WoltRestaurant): boolean => r.name === restaurantName) || null;
}
