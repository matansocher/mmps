import { IInlineKeyboardButton } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS, TABIT_BOT_OPTIONS } from './tabit.config';

const CALLBACK_DATA_SEPARATOR = ',';

export const getGeneralKeyboardOptions = () => {
  return {
    reply_markup: {
      keyboard: Object.keys(TABIT_BOT_OPTIONS).map((option: string) => {
        return [{ text: TABIT_BOT_OPTIONS[option] }];
      }),
      resize_keyboard: true,
    },
  };
};

export const convertInlineKeyboardButtonToCallbackData = (inlineKeyboardButton: IInlineKeyboardButton): string => {
  const args: any[] = [inlineKeyboardButton.action, inlineKeyboardButton.data];
  return args.join(CALLBACK_DATA_SEPARATOR);
};

export const convertCallbackDataToInlineKeyboardButton = (callbackData: string): IInlineKeyboardButton => {
  const [action, data] = callbackData.split(CALLBACK_DATA_SEPARATOR);
  return { action: action as BOT_BUTTONS_ACTIONS, data };
};
