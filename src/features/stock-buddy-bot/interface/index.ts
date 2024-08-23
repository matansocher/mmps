import { BOT_BUTTONS_ACTIONS } from '@features/stock-buddy-bot/stock-buddy-bot.config';

export interface IInlineButtonData {
  text: string;
  action: BOT_BUTTONS_ACTIONS;
}
