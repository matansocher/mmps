import { IFlowStepType, IOntopoRestaurant } from '.';

export interface IUserFlowDetails {
  currentStepIndex: number;
  restaurantDetails?: IOntopoRestaurant;
  numOfSeats?: number;
  date?: Date;
  time?: string;
  area?: string;
  botQuestionsMessageIds?: {
    [key in IFlowStepType]: number;
  };
}

export type IUserSelections = Pick<IUserFlowDetails, 'numOfSeats' | 'date' | 'time' | 'area'>;
