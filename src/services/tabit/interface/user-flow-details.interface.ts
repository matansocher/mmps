import { IFlowStepType, ITabitRestaurant } from '.';

export interface IUserFlowDetails {
  currentStepIndex: number;
  restaurantDetails?: ITabitRestaurant;
  numOfSeats?: number;
  date?: Date;
  time?: string;
  area?: string;
  botQuestionsMessageIds?: {
    [key in IFlowStepType]: number;
  };
}

export type IUserSelections = Pick<IUserFlowDetails, 'numOfSeats' | 'date' | 'time' | 'area'>;
