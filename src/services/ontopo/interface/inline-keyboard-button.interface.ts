import { BOT_BUTTONS_ACTIONS } from '@services/ontopo/ontopo.config';

export interface IInlineKeyboardButton {
  action: BOT_BUTTONS_ACTIONS;
  data: string;
}