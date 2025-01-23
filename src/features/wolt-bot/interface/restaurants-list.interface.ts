import { WoltRestaurant } from './wolt-restaurant.interface';

export interface RestaurantsList {
  restaurants: WoltRestaurant[];
  lastUpdated: number;
}
