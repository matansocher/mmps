import { IWoltRestaurant } from '@services/wolt';

export interface IRestaurantsList {
  restaurants: IWoltRestaurant[];
  lastUpdated: number;
}
