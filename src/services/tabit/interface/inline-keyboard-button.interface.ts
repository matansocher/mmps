import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';

export interface IInlineKeyboardButton {
  action: BOT_BUTTONS_ACTIONS;
  data: string;
}
