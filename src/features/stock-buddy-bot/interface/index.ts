import { BOT_BUTTONS_ACTIONS } from '@features/stock-buddy-bot/stock-buddy-bot.config';

export interface IInlineButtonCompanyDetails {
  action: BOT_BUTTONS_ACTIONS;
  symbol: string;
}
