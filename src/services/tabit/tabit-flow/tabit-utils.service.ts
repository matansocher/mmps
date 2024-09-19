import { SubscriptionModel } from '@core/mongo/tabit-mongo/models';
import { Injectable } from '@nestjs/common';
import { IInlineKeyboardButton } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS, RESTAURANT_FOR_USER_BASE_URL } from '@services/tabit/tabit.config';
import { TelegramGeneralService } from '@services/telegram';

const CALLBACK_DATA_SEPARATOR = ',';

@Injectable()
export class TabitUtilsService {
  constructor(private readonly telegramGeneralService: TelegramGeneralService) {}

  convertInlineKeyboardButtonToCallbackData(inlineKeyboardButton: IInlineKeyboardButton): string {
    const args = [inlineKeyboardButton.action, inlineKeyboardButton.data];
    return args.join(CALLBACK_DATA_SEPARATOR);
  }

  convertCallbackDataToInlineKeyboardButton(callbackData: string): IInlineKeyboardButton {
    const [action, data] = callbackData.split(CALLBACK_DATA_SEPARATOR);
    return { action: action as BOT_BUTTONS_ACTIONS, data };
  }

  getRestaurantLinkForUser(restaurantId: string): string {
    return RESTAURANT_FOR_USER_BASE_URL.replace('{restaurantId}', restaurantId);
  }

  getDateStringFormat(date: Date): string {
    const getTwoDigits = (num: number): string => (num < 10 ? `0${num}` : num.toString());
    return `${date.getFullYear()}-${getTwoDigits(date.getMonth() + 1)}-${getTwoDigits(date.getDate())}`;
  }

  getSubscriptionDetails(subscription: SubscriptionModel): { text: string; inlineKeyboardMarkup: { reply_markup: string }; } {
    const callbackData = { action: BOT_BUTTONS_ACTIONS.UNSUBSCRIBE, data: subscription._id.toString() } as IInlineKeyboardButton;
    const { restaurantDetails, userSelections } = subscription;
    const inlineKeyboardButtons = [
      {
        text: `Unsubscribe`,
        callback_data: this.convertInlineKeyboardButtonToCallbackData(callbackData),
      },
    ];
    const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
    const resTextDetails = [
      `🧑‍🍳 ${restaurantDetails.title}`,
      `⏰ ${this.getDateStringFormat(userSelections.date)} ${userSelections.time}`,
      `🪑 ${userSelections.size}`,
      `⛺️ ${userSelections.area}`,
    ];
    const text = resTextDetails.join('\n');
    return { text, inlineKeyboardMarkup };
  }
}
