import { IWoltRestaurant } from '@services/wolt/interface';

export interface IRestaurantsList {
  restaurants: IWoltRestaurant[];
  lastUpdated: number;
}
