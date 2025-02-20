import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionModel, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage, hasHebrew } from '@core/utils';
import { WoltRestaurant } from '@features/wolt-bot/interface';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram/utils/register-handlers';
import { RestaurantsService } from './restaurants.service';
import { getRestaurantsByName } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, INITIAL_BOT_RESPONSE, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER, WOLT_BOT_COMMANDS } from './wolt-bot.config';

@Injectable()
export class WoltBotService implements OnModuleInit {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(WOLT_BOT_COMMANDS));

    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST } = WOLT_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({
      bot: this.bot,
      logger: new Logger(BOTS.WOLT.id),
      handlers,
    });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = getMessageData(message);

    try {
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.bot.sendMessage(chatId, replyText);
      this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
    } catch (err) {
      this.notifierBotService.notify(
        BOTS.WOLT,
        {
          action: ANALYTIC_EVENT_NAMES.ERROR,
          error: `error - ${getErrorMessage(err)}`,
          method: this.startHandler.name,
        },
        chatId,
        this.mongoUserService,
      );
      throw err;
    }
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `אין לך התראות פתוחות`;
        await this.bot.sendMessage(chatId, replyText);
        return;
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const inlineKeyboardButtons = [
          {
            text: '⛔️ הסרה ⛔️',
            callback_data: `${BOT_ACTIONS.REMOVE} - ${subscription.restaurant}`,
          },
        ];
        const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.bot.sendMessage(chatId, subscription.restaurant, inlineKeyboardMarkup as any);
      });
      await Promise.all(promisesArr);
    } catch (err) {
      this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `error - ${getErrorMessage(err)}`, method: this.listHandler.name }, chatId, this.mongoUserService);
      throw err;
    }
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text: rawRestaurant } = getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase().trim();

    // prevent built in options to be processed also here
    if (Object.values(WOLT_BOT_COMMANDS).some((command: BotCommand) => restaurant.includes(command.command))) return;

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
      await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup as any);
      this.notifierBotService.notify(
        BOTS.WOLT,
        {
          action: ANALYTIC_EVENT_NAMES.SEARCH,
          search: rawRestaurant,
          restaurants: matchedRestaurants.map((r) => r.name).join(' | '),
        },
        chatId,
        this.mongoUserService,
      );
    } catch (err) {
      this.notifierBotService.notify(
        BOTS.WOLT,
        {
          restaurant,
          action: ANALYTIC_EVENT_NAMES.ERROR,
          error: `error - ${getErrorMessage(err)}`,
          method: this.textHandler.name,
        },
        chatId,
        this.mongoUserService,
      );
      throw err;
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, data: restaurant } = getCallbackQueryData(callbackQuery);

    try {
      const restaurantName = restaurant.replace(`${BOT_ACTIONS.REMOVE} - `, '');
      const activeSubscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);

      if (restaurant.startsWith(`${BOT_ACTIONS.REMOVE} - `)) {
        await this.handleCallbackRemoveSubscription(chatId, restaurantName, activeSubscriptions);
      } else {
        await this.handleCallbackAddSubscription(chatId, restaurantName, activeSubscriptions);
      }
    } catch (err) {
      await this.notifierBotService.notify(
        BOTS.WOLT,
        {
          restaurant,
          action: ANALYTIC_EVENT_NAMES.ERROR,
          error: getErrorMessage(err),
          method: this.callbackQueryHandler.name,
        },
        chatId,
        this.mongoUserService,
      );
      throw err;
    }
  }

  async handleCallbackAddSubscription(chatId: number, restaurant: string, activeSubscriptions: SubscriptionModel[]): Promise<void> {
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
      await this.bot.sendMessage(chatId, replyText, form as any);
      return;
    }

    const replyText = ['סגור, אני אתריע ברגע שאני אראה שהמסעדה נפתחת 🚨', restaurant].join('\n');
    await this.mongoSubscriptionService.addSubscription(chatId, restaurant, restaurantDetails?.photo);
    await this.bot.sendMessage(chatId, replyText);

    this.notifierBotService.notify(
      BOTS.WOLT,
      {
        action: ANALYTIC_EVENT_NAMES.SUBSCRIBE,
        restaurant,
      },
      chatId,
      this.mongoUserService,
    );
  }

  async handleCallbackRemoveSubscription(chatId: number, restaurant: string, activeSubscriptions: SubscriptionModel[]): Promise<void> {
    let replyText;
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      await this.mongoSubscriptionService.archiveSubscription(chatId, restaurant);
      replyText = [`סבבה, הורדתי את ההתראה ל:`, restaurant].join('\n');
    } else {
      replyText = [`🤔 הכל טוב, כבר אין לך התראה פתוחה על:`, restaurant].join('\n');
    }
    await this.bot.sendMessage(chatId, replyText);
  }
}
