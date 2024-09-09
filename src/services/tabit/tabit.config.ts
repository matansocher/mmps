import { IFlowStepType, IFlowStep } from '@services/tabit/interface';
import {
  DateHandler,
  DetailsHandler,
  NumOfSeatsHandler,
  AreaHandler,
  TimeHandler
} from '@services/tabit/tabit-flow/step-handlers';

export const MAX_SUBSCRIPTIONS_NUMBER = 10;

export const INITIAL_BOT_RESPONSE = `Hi {firstName}!\n\nI'm a bot that can alert you when a tabit restaurant reservation in a specific time is available.\n\nYou can enter the restaurant name you want to check\n\nTo show current notification registrations you can write: /show\nIf by any reason you want to restart the reservation process you can write: /reset\n`;

export const HOURS_DIFFERENCE_FROM_UTC = 2; // $$$$$$$$$$$$$$$$$$$$$$$$$$$$

export const RESTAURANT_FOR_USER_BASE_URL = `https://tabitisrael.co.il/%D7%94%D7%96%D7%9E%D7%A0%D7%AA-%D7%9E%D7%A7%D7%95%D7%9D/create-reservation?step=search&orgId={restaurantId}`;
export const RESTAURANT_DETAILS_BASE_URL = `https://tgm-api.tabit.cloud/rsv/management/organization-configuration`;
export const RESTAURANT_CONFIGURATION_BASE_URL = `https://tgm-api.tabit.cloud/rsv/booking/configuration`;
export const RESTAURANT_CHECK_AVAILABILITY_URL = `https://tgm-api.tabit.cloud/rsv/booking/temp-reservations`;
export const RESTAURANT_CHECK_AVAILABILITY_BASE_BODY = {
  type: 'future_reservation',
  standby_reservation: false,
  arriving_within: null,
  online_booking_source: 'tabit',
  online_booking_source_client: {
    name: 'tabit-web',
    environment: 'il-prod',
  },
  modified_reservation_id: '',
};

export const TABIT_BOT_COMMANDS = {
  START: '/start',
  SHOW: '/show',
  RESET: '/reset',
};

export const TABIT_FLOW_STEPS: IFlowStep[] = [
  {
    id: IFlowStepType.DETAILS,
    handler: DetailsHandler,
  },
  {
    id: IFlowStepType.DATE,
    handler: DateHandler,
    preUserActionResponseMessage: 'What date do you want me to search for?',
  },
  {
    id: IFlowStepType.TIME,
    handler: TimeHandler,
    preUserActionResponseMessage: 'What time do ou want me to search for?\nYou can also send a custom time in the format: HH:MM, example: 19:45',
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

export const SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS: Record<string, number> = {
  FAST: 60 * 5,
  IDLE: 60 * 60,
};

export const TIME_GAP_FROM_USER_SELECTION_IN_MINUTES = 60;

export const HOUR_OF_DAY_TO_REFRESH_MAP = {
  0: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  1: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  2: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  3: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  4: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  5: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  6: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  7: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.IDLE,
  8: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  9: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  10: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  11: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  12: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  13: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  14: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  15: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  16: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  17: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  18: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  19: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  20: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  21: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  22: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
  23: SECONDS_BETWEEN_RESTAURANTS_REFRESH_OPTIONS.FAST,
};

export enum BOT_BUTTONS_ACTIONS {
  UNSUBSCRIBE = 'unsubscribe',
  DATE = 'date',
  TIME = 'time',
  NUM_OF_SEATS = 'numOfSeats',
  AREA = 'area',
}
