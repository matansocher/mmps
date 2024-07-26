import { IWoltRestaurant } from '@services/wolt/interface/wolt-restaurant.interface';

export interface IRestaurantsList {
  restaurants: IWoltRestaurant[];
  lastUpdated: number;
}
