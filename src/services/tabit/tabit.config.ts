import { IFlowStepType, IFlowStep } from '@services/tabit/interface';
import {
  DateHandler,
  DetailsHandler,
  NumOfSeatsHandler,
  AreaHandler,
  TimeHandler
} from '@services/tabit/tabit-flow/step-handlers';

export const INITIAL_BOT_RESPONSE = `Hi {firstName}!\n\nI'm a bot that can alert you when a tabit restaurant reservation in a specific time is available.\n\nYou can enter the restaurant name you want to check\n\nTo show current notification registrations you can write: /show\n\n`;

export const HOURS_DIFFERENCE_FROM_UTC = 2; // $$$$$$$$$$$$$$$$$$$$$$$$$$$$

export const RESTAURANT_DETAILS_BASE_URL = `https://tgm-api.tabit.cloud/rsv/management/organization-configuration`;
export const RESTAURANT_CONFIGURATION_BASE_URL = `https://tgm-api.tabit.cloud/rsv/booking/configuration`;
export const RESTAURANT_CHECK_AVAILABILITY_URL = `https://tgm-api.tabit.cloud/rsv/booking/temp-reservations`;
export const RESTAURANT_CHECK_AVAILABILITY_BASE_BODY = {
  type: 'future_reservation',
  standby_reservation: false,
  arriving_within: null,
  online_booking_source_client: {
    name: 'tabit-web',
    environment: 'il-prod',
  },
  modified_reservation_id: '',
};

export const TABIT_BOT_OPTIONS = {
  START: '/start',
  SHOW: '/show',
};

export const TABIT_FLOW_STEPS: IFlowStep[] = [
  {
    id: IFlowStepType.DETAILS,
    handler: DetailsHandler,
  },
  {
    id: IFlowStepType.DATE,
    handler: DateHandler,
    preUserActionResponseMessage: 'What date do ou want me to search for?',
  },
  {
    id: IFlowStepType.TIME,
    handler: TimeHandler,
    preUserActionResponseMessage: 'What time do ou want me to search for?',
  },
  {
    id: IFlowStepType.NUM_OF_SEATS,
    handler: NumOfSeatsHandler,
    preUserActionResponseMessage: 'How many seats do you want me to search for?',
  },
  {
    id: IFlowStepType.AREA,
    handler: AreaHandler,
    preUserActionResponseMessage: 'What area do you want me to search for?',
  },
];

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  SHOW: 'SHOW',
  SEARCH: 'SEARCH',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUBSCRIPTION_FULFILLED: 'SUBSCRIPTION_FULFILLED',
  SUBSCRIPTION_FAILED: 'SUBSCRIPTION_FAILED',
  ERROR: 'ERROR',
};

export enum BOT_BUTTONS_ACTIONS {
  UNSUBSCRIBE = 'unsubscribe',
  DATE = 'date',
  TIME = 'time',
  NUM_OF_SEATS = 'numOfSeats',
  AREA = 'area',
}
