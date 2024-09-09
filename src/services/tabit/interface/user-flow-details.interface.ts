import { ITabitRestaurant } from '.';

export interface IUserFlowDetails {
  currentStepIndex: number;
  restaurantDetails?: ITabitRestaurant;
  numOfSeats?: number;
  date?: Date;
  time?: string;
  area?: string;
}

export type IUserSelections = Pick<IUserFlowDetails, 'numOfSeats' | 'date' | 'time' | 'area'>;
