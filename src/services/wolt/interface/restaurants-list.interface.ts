import { IWoltRestaurant } from './wolt-restaurant.interface';

export interface IRestaurantsList {
  restaurants: IWoltRestaurant[];
  lastUpdated: number;
}
