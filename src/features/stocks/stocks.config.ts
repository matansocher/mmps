import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'STOCKS',
  name: 'Stocks Bot 📈',
  token: 'STOCKS_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start over', hide: true },
    STATUS: { command: '/status', description: '📊 Portfolio Status' },
    TOP: { command: '/top', description: '🔥 Top Stocks & Indexes' },
    ACTIONS: { command: '/actions', description: '⚙️ Settings' },
  },
};

export const ANALYTIC_EVENT_NAMES = {
  START: 'START',
  STOP: 'STOP',
  SEARCH: 'SEARCH',
  BUY: 'BUY',
  SELL: 'SELL',
  STATUS: 'STATUS',
  CONTACT: 'CONTACT',
  ERROR: 'ERROR',
};

export enum BOT_ACTIONS {
  EMPTY = 'empty',
  START = 'start',
  STOP = 'stop',
  CONTACT = 'contact',
  BUY = 'buy',
  SELL = 'sell',
  SELECT_STOCK = 'select',
}
