export const INITIAL_BOT_RESPONSE = `Hello {firstName}! I am stock buddy. I can help you with stock market information. Please choose an option from the menu below.`;

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

export const STOCK_BUDDY_BOT_OPTIONS = {
  START: '/start',
  SHOW: '/show',
};

export enum BOT_BUTTONS_ACTIONS {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}
