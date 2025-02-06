import { BotCommand } from 'node-telegram-bot-api';

export const ANALYTIC_EVENT_STATES = {
  START: 'START',
  MANAGEMENT: 'MANAGEMENT',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  CHECK: 'CHECK',
  SUCCESS: 'SUCCESS',
  REFRESH: 'REFRESH',
  ALERTED: 'ALERTED',
  ERROR: 'ERROR',
};

export const NAME_TO_PLAN_ID_MAP: Record<string, number> = {
  'Sequoia - 1x1': 2405125,
  'Maple - 1x1': 2405126,
  'Redwood - 2x1': 2405133,
  'Oak - 3x2': 2405134,
};

export enum BOT_ACTIONS {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

export const ROLLINSPARK_BOT_COMMANDS: Record<string, BotCommand> = {
  START: { command: '/start', description: 'Start all over' },
  MANAGEMENT: { command: '/management', description: 'Manage subscriptions' },
};
