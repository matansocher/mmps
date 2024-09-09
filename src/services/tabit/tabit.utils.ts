import { IInlineKeyboardButton } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS, RESTAURANT_FOR_USER_BASE_URL } from './tabit.config';

const CALLBACK_DATA_SEPARATOR = ',';

export const convertInlineKeyboardButtonToCallbackData = (inlineKeyboardButton: IInlineKeyboardButton): string => {
  const args = [inlineKeyboardButton.action, inlineKeyboardButton.data];
  return args.join(CALLBACK_DATA_SEPARATOR);
};

export const convertCallbackDataToInlineKeyboardButton = (callbackData: string): IInlineKeyboardButton => {
  const [action, data] = callbackData.split(CALLBACK_DATA_SEPARATOR);
  return { action: action as BOT_BUTTONS_ACTIONS, data };
};

export const getRestaurantLinkForUser = (restaurantId: string): string => {
  return RESTAURANT_FOR_USER_BASE_URL.replace('{restaurantId}', restaurantId);
};
