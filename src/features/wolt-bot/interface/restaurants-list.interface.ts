import type { WoltRestaurant } from './wolt-restaurant.interface';

export interface RestaurantsList {
  readonly restaurants: WoltRestaurant[];
  readonly lastUpdated: number;
}
