import { IFlowStepType, IFlowStep } from '@services/ontopo/interface';
import { DateHandler, DetailsHandler, SizeHandler, AreaHandler, TimeHandler } from '@services/ontopo/ontopo-flow/step-handlers';

export const MAX_SUBSCRIPTIONS_NUMBER = 10;

export const INITIAL_BOT_RESPONSE = `Hi {firstName}!\n\nI'm a bot that can alert you when an ontopo restaurant reservation in a specific time is available.\n\nYou can enter the restaurant name you want to check\n\nTo show current notification registrations you can write: /show\nIf by any reason you want to restart the reservation process you can write: /reset\n`;

export const RESTAURANT_FOR_USER_BASE_URL = `https://ontopo.com/he/il/page`;
// export const RESTAURANT_CHECK_AVAILABILITY_URL = `https://ontopo.co.il/api/availability/searchAvailability`;
export const RESTAURANT_CHECK_AVAILABILITY_URL = `https://ontopo.com/api/availability_search`;

export const ONTOPO_BOT_COMMANDS = {
  START: '/start',
  SHOW: '/show',
  RESET: '/reset',
};

export const ONTOPO_FLOW_STEPS: IFlowStep[] = [
  {
    id: IFlowStepType.DETAILS,
    handler: DetailsHandler,
  },
  {
    id: IFlowStepType.DATE,
    handler: DateHandler,
    preUserActionResponseMessage: 'What date do you want me to search for?\nYou can also send a custom date in the format: YYYY-MM-DD, example: 2024-12-28',
  },
  {
    id: IFlowStepType.TIME,
    handler: TimeHandler,
    preUserActionResponseMessage: 'What time do ou want me to search for?\nYou can also send a custom time in the format: HH:MM, example: 19:45',
  },
  {
    id: IFlowStepType.SIZE,
    handler: SizeHandler,
    preUserActionResponseMessage: 'How many people do you want me to search for?',
  },
  {
    id: IFlowStepType.AREA,
    handler: AreaHandler,
    preUserActionResponseMessage: 'What area do you want me to search for?',
  },
];

export const ANALYTIC_EVENT_NAMES = {
  START: 'start',
  SHOW: 'show',
  SEARCH: 'search',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  SUBSCRIPTION_FULFILLED: 'subscription_fulfilled',
  SUBSCRIPTION_FAILED: 'subscription_failed',
  ERROR: 'error',
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
  SIZE = 'size',
  AREA = 'area',
}
