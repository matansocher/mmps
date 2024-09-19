import { IFlowStepType, ITabitRestaurant } from '.';

export interface IUserFlowDetails {
  currentStepIndex: number;
  restaurantDetails?: ITabitRestaurant;
  size?: number;
  date?: Date;
  time?: string;
  area?: string;
  botQuestionsMessageIds?: {
    [key in IFlowStepType]: number;
  };
}

export type IUserSelections = Pick<IUserFlowDetails, 'size' | 'date' | 'time' | 'area'>;
