import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { Subscription, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierService } from '@core/notifier';
import { getDateNumber, hasHebrew } from '@core/utils';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { WoltRestaurant } from './interface';
import { RestaurantsService } from './restaurants.service';
import { getRestaurantsByName } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER } from './wolt.config';

const customErrorMessage = `מצטער, אבל קרתה לי תקלה. אפשר לנסות שוב מאוחר יותר 😥`;

@Injectable()
export class WoltController implements OnModuleInit {
  private readonly logger = new Logger(WoltController.name);

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly userDB: WoltMongoUserService,
    private readonly subscriptionDB: WoltMongoSubscriptionService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST, CONTACT } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: COMMAND, regex: CONTACT.command, handler: (message) => this.contactHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const userExists = await this.userDB.saveUserDetails(userDetails);

    const newUserReplyText = [
      `שלום {firstName}!`,
      `אני בוט שמתריע על מסעדות שנפתחות להזמנה בוולט`,
      `פשוט תשלחו לי את שם המסעדה (באנגלית 🇺🇸), ואני אגיד לכם מתי היא נפתחת`,
      `כדי לראות את רשימת ההתראות הפתוחות אפשר להשתמש בפקודה /list`,
    ]
      .join('\n')
      .replace('{firstName}', userDetails.firstName || userDetails.username || '');
    const existingUserReplyText = `מעולה, הכל מוכן ואפשר להתחיל לחפש 🍔🍕🍟`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  async contactHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    try {
      const subscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `אין לך התראות פתוחות`;
        await this.bot.sendMessage(chatId, replyText);
        return;
      }

      const promisesArr = subscriptions.map((subscription: Subscription) => {
        const inlineKeyboardButtons = [
          {
            text: '⛔️ הסרה ⛔️',
            callback_data: `${BOT_ACTIONS.REMOVE} - ${subscription.restaurant}`,
          },
        ];
        const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
        const subscriptionTime = `${getDateNumber(subscription.createdAt.getHours())}:${getDateNumber(subscription.createdAt.getMinutes())}`;
        return this.bot.sendMessage(chatId, `${subscriptionTime} - ${subscription.restaurant}`, inlineKeyboardMarkup);
      });
      await Promise.all(promisesArr);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LIST }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `error - ${err}`, method: this.listHandler.name }, userDetails);
      throw err;
    }
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, userDetails, text: rawRestaurant } = getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase().trim();

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command: BotCommand) => restaurant.includes(command.command))) return;

    try {
      if (hasHebrew(restaurant)) {
        await this.bot.sendMessage(chatId, 'אני מדבר עברית שוטף, אבל אני יכול לחפש מסעדות רק באנגלית 🇺🇸');
        return;
      }

      const restaurants = await this.restaurantsService.getRestaurants();
      const matchedRestaurants = getRestaurantsByName(restaurants, restaurant);
      if (!matchedRestaurants.length) {
        const replyText = ['וואלה חיפשתי ולא מצאתי אף מסעדה שמתאימה לחיפוש:', restaurant].join('\n');
        await this.bot.sendMessage(chatId, replyText);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: 'No matched restaurants' }, userDetails);
        return;
      }
      const inlineKeyboardButtons = matchedRestaurants.map((restaurant) => {
        // const isAvailableComment = restaurant.isOnline ? 'Open 🟢' : restaurant.isOpen ? 'Busy ⏳' : 'Closed 🛑';
        const isAvailableComment = restaurant.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑';
        return {
          text: `${restaurant.name} - ${isAvailableComment}`,
          callback_data: restaurant.name,
        };
      });
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `אפשר לבחור את אחת מהמסעדות האלה, ואני אתריע כשהיא נפתחת`;
      await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: matchedRestaurants.map((r) => r.name).join(' | ') }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: `${err}`, method: this.textHandler.name }, userDetails);
      throw err;
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: restaurant } = getCallbackQueryData(callbackQuery);

    try {
      const restaurantName = restaurant.replace(`${BOT_ACTIONS.REMOVE} - `, '');
      const activeSubscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);

      if (restaurant.startsWith(`${BOT_ACTIONS.REMOVE} - `)) {
        await this.handleCallbackRemoveSubscription(chatId, messageId, restaurantName, activeSubscriptions);
      } else {
        await this.handleCallbackAddSubscription(chatId, userDetails, restaurantName, activeSubscriptions);
      }
    } catch (err) {
      await this.notifier.notify(BOT_CONFIG, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: `${err}`, method: this.callbackQueryHandler.name }, userDetails);
      throw err;
    }
  }

  async handleCallbackAddSubscription(chatId: number, userDetails: UserDetails, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      const replyText = ['הכל טוב, כבר יש לך התראה על המסעדה:', restaurant].join('\n');
      await this.bot.sendMessage(chatId, replyText);
      return;
    }

    if (activeSubscriptions?.length >= MAX_NUM_OF_SUBSCRIPTIONS_PER_USER) {
      await this.bot.sendMessage(chatId, ['אני מצטער, אבל יש כבר יותר מדי התראות פתוחות', 'יש לי הגבלה של עד 3 התראות למשתמש 😥'].join('\n'));
      return;
    }

    const restaurants = await this.restaurantsService.getRestaurants();
    const restaurantDetails = restaurants.find((r: WoltRestaurant): boolean => r.name === restaurant);
    if (!restaurantDetails) {
      await this.bot.sendMessage(chatId, 'אני מצטער אבל לא הצלחתי למצוא את המסעדה הזאת');
      return;
    }
    if (restaurantDetails.isOnline) {
      const replyText = [`נראה שהמסעדה פתוחה ממש עכשיו 🟢`, `אפשר להזמין ממנה עכשיו! 🍴`].join('\n');
      const inlineKeyboardButtons = [{ text: restaurantDetails.name, url: restaurantDetails.link }];
      const form = getInlineKeyboardMarkup(inlineKeyboardButtons);
      await this.bot.sendMessage(chatId, replyText, form);
      return;
    }

    const replyText = ['סגור, אני אתריע ברגע שאני אראה שהמסעדה נפתחת 🚨', restaurant].join('\n');
    await this.subscriptionDB.addSubscription(chatId, restaurant, restaurantDetails?.photo);
    await this.bot.sendMessage(chatId, replyText);

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, restaurant }, userDetails);
  }

  async handleCallbackRemoveSubscription(chatId: number, messageId: number, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
    let replyText;
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      await this.subscriptionDB.archiveSubscription(chatId, restaurant, false);
      replyText = [`סבבה, הורדתי את ההתראה ל:`, restaurant].join('\n');
    } else {
      replyText = [`🤔 הכל טוב, כבר אין לך התראה פתוחה על:`, restaurant].join('\n');
    }
    await this.bot.sendMessage(chatId, replyText);
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId });
  }
}
