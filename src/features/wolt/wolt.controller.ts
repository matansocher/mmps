import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { Subscription, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierService } from '@core/notifier';
import { getDateNumber, hasHebrew } from '@core/utils';
import { getCallbackQueryData, getCustomInlineKeyboardMarkup, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { WoltRestaurant } from './interface';
import { RestaurantsService } from './restaurants.service';
import { getRestaurantsByName } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, MAX_NUM_OF_RESTAURANTS_TO_SHOW, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER } from './wolt.config';

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
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START, isNewUser: !userExists }, userDetails);
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
            callback_data: [BOT_ACTIONS.REMOVE, subscription.restaurant].join(INLINE_KEYBOARD_SEPARATOR),
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

      let inlineKeyboardButtons = matchedRestaurants.map((restaurant) => {
        return {
          text: `${restaurant.name} - ${restaurant.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑'}`,
          callback_data: [BOT_ACTIONS.ADD, restaurant.name].join(INLINE_KEYBOARD_SEPARATOR),
        };
      });

      if (matchedRestaurants.length > MAX_NUM_OF_RESTAURANTS_TO_SHOW) {
        inlineKeyboardButtons = [...inlineKeyboardButtons.slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW)];
        inlineKeyboardButtons.push({ text: 'דף הבא (2) ➡️', callback_data: [BOT_ACTIONS.CHANGE_PAGE, restaurant, 2].join(INLINE_KEYBOARD_SEPARATOR) });
      }

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
    const { chatId, userDetails, messageId, data } = getCallbackQueryData(callbackQuery);

    const [action, restaurant, page] = data.split(INLINE_KEYBOARD_SEPARATOR);
    const restaurantName = restaurant.replace(BOT_ACTIONS.REMOVE, '').replace(INLINE_KEYBOARD_SEPARATOR, '');
    const activeSubscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);
    try {
      switch (action) {
        case BOT_ACTIONS.REMOVE: {
          await this.removeSubscription(chatId, userDetails, messageId, restaurantName, activeSubscriptions);
          break;
        }
        case BOT_ACTIONS.ADD: {
          await this.addSubscription(chatId, userDetails, restaurantName, activeSubscriptions);
          break;
        }
        case BOT_ACTIONS.CHANGE_PAGE: {
          await this.changePage(chatId, userDetails, messageId, restaurantName, parseInt(page));
          break;
        }
        default: {
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'לא הבנתי את הבקשה שלך 😕' });
          await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
          break;
        }
      }
    } catch (err) {
      this.logger.error(`${this.callbackQueryHandler.name} - error - ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `${err}`, method: this.callbackQueryHandler.name }, userDetails);
    }
  }

  async addSubscription(chatId: number, userDetails: UserDetails, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
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

  async removeSubscription(chatId: number, userDetails: UserDetails, messageId: number, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      await this.subscriptionDB.archiveSubscription(chatId, restaurant, false);
      await this.bot.sendMessage(chatId, [`סבבה, הורדתי את ההתראה ל:`, restaurant].join('\n'));
    } else {
      await this.bot.sendMessage(chatId, [`🤔 הכל טוב, כבר אין לך התראה פתוחה על:`, restaurant].join('\n'));
    }
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, restaurant }, userDetails);
  }

  async changePage(chatId: number, userDetails: UserDetails, messageId: number, restaurant: string, page: number): Promise<void> {
    const restaurants = await this.restaurantsService.getRestaurants();
    const matchedRestaurants = getRestaurantsByName(restaurants, restaurant);
    const from = MAX_NUM_OF_RESTAURANTS_TO_SHOW * (page - 1);
    const to = from + MAX_NUM_OF_RESTAURANTS_TO_SHOW;
    const newPageRestaurants = matchedRestaurants.slice(from, to);
    const newInlineKeyboardMarkup = newPageRestaurants.map((restaurant) => {
      return {
        text: `${restaurant.name} - ${restaurant.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑'}`,
        callback_data: [BOT_ACTIONS.ADD, restaurant.name].join(INLINE_KEYBOARD_SEPARATOR),
      };
    });

    const previousPageExists = page > 1;
    if (previousPageExists) {
      newInlineKeyboardMarkup.push({ text: ['⬅️', `(${page - 1})`, 'דף הקודם'].join(' '), callback_data: [BOT_ACTIONS.CHANGE_PAGE, restaurant, page - 1].join(INLINE_KEYBOARD_SEPARATOR) });
    }
    const nextPageExists = to < matchedRestaurants.length;
    if (nextPageExists) {
      newInlineKeyboardMarkup.push({ text: ['➡️', `(${page + 1})`, 'דף הבא'].join(' '), callback_data: [BOT_ACTIONS.CHANGE_PAGE, restaurant, page + 1].join(INLINE_KEYBOARD_SEPARATOR) });
    }
    const columnsPerRow: number[] = [...newPageRestaurants.map(() => 1), previousPageExists && nextPageExists ? 2 : 1];
    const inlineKeyboardMarkup = getCustomInlineKeyboardMarkup(newInlineKeyboardMarkup, columnsPerRow);
    await this.bot.editMessageReplyMarkup(inlineKeyboardMarkup.reply_markup, { message_id: messageId, chat_id: chatId });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHANGE_PAGE, restaurant }, userDetails);
  }
}
