import { IFlowStepType, IOntopoRestaurant } from '.';

export interface IUserFlowDetails {
  currentStepIndex: number;
  restaurantDetails?: IOntopoRestaurant;
  size?: number;
  date?: Date;
  time?: string;
  area?: string;
  botQuestionsMessageIds?: {
    [key in IFlowStepType]: number;
  };
}

export type IUserSelections = Pick<IUserFlowDetails, 'size' | 'date' | 'time' | 'area'>;
