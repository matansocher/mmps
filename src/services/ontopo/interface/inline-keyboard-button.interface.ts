import { BOT_BUTTONS_ACTIONS } from '../ontopo.config';

export interface IInlineKeyboardButton {
  action: BOT_BUTTONS_ACTIONS;
  data: string;
}
