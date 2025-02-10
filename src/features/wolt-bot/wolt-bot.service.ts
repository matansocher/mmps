import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionModel, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, handleCommand, TELEGRAM_EVENTS, TelegramBotHandler } from '@services/telegram';
import { getEnrichedRestaurantsDetails, getRestaurantLink } from './utils';
import { ANALYTIC_EVENT_NAMES, INITIAL_BOT_RESPONSE, SUBSCRIPTION_EXPIRATION_HOURS, TOO_OLD_LIST_THRESHOLD_MS, WOLT_BOT_COMMANDS } from './wolt-bot.config';
import { WoltService } from './wolt.service';

@Injectable()
export class WoltBotService implements OnModuleInit {
  private readonly logger = new Logger(WoltBotService.name);

  constructor(
    private readonly woltService: WoltService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(WOLT_BOT_COMMANDS));
    const handlers: TelegramBotHandler[] = [
      { regex: WOLT_BOT_COMMANDS.START.command, handler: this.startHandler },
      { regex: WOLT_BOT_COMMANDS.LIST.command, handler: this.listHandler },
    ];
    const handleCommandOptions = { bot: this.bot, logger: this.logger };

    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await handleCommand({
          ...handleCommandOptions,
          message,
          handlerName: handler.name,
          handler: async () => handler.call(this, message),
        });
      });
    });

    this.bot.on(TELEGRAM_EVENTS.TEXT, async (message: Message) => {
      await handleCommand({
        ...handleCommandOptions,
        message,
        handlerName: this.textHandler.name,
        handler: async () => this.textHandler.call(this, message),
      });
    });

    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
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
      throw 'smome new error';
      // if (!subscriptions.length) {
      //   const replyText = `You don't have any active subscriptions yet`;
      //   await this.bot.sendMessage(chatId, replyText);
      //   return;
      // }
      //
      // const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
      //   const inlineKeyboardButtons = [{ text: 'Remove', callback_data: `remove - ${subscription.restaurant}` }];
      //   const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      //   return this.bot.sendMessage(chatId, subscription.restaurant, inlineKeyboardMarkup as any);
      // });
      // await Promise.all(promisesArr);
    } catch (err) {
      this.notifierBotService.notify(
        BOTS.WOLT,
        { action: ANALYTIC_EVENT_NAMES.ERROR, error: `error - ${getErrorMessage(err)}`, method: this.listHandler.name },
        chatId,
        this.mongoUserService,
      );
      throw err;
    }
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text: rawRestaurant } = getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase().trim();

    // prevent built in options to be processed also here
    if (Object.values(WOLT_BOT_COMMANDS).some((command: BotCommand) => restaurant.includes(command.command))) return;

    try {
      const isLastUpdatedTooOld = new Date().getTime() - this.woltService.getLastUpdated() > TOO_OLD_LIST_THRESHOLD_MS;
      if (isLastUpdatedTooOld) {
        await this.woltService.refreshRestaurants();
      }
      const matchedRestaurants = this.woltService.getFilteredRestaurantsByName(restaurant);
      if (!matchedRestaurants.length) {
        const replyText = `I am sorry, I didn't find any restaurants matching your search - '${restaurant}'`;
        await this.bot.sendMessage(chatId, replyText);
        return;
      }
      const restaurants = await getEnrichedRestaurantsDetails(matchedRestaurants);
      const inlineKeyboardButtons = restaurants.map((restaurant) => {
        const isAvailableComment = restaurant.isOnline ? 'Open 🟢' : restaurant.isOpen ? 'Busy ⏳' : 'Closed 🛑';
        return {
          text: `${restaurant.name} - ${isAvailableComment}`,
          callback_data: restaurant.name,
        };
      });
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `Choose one of the above restaurants so I can notify you when it's online`;
      await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup as any);
      this.notifierBotService.notify(
        BOTS.WOLT,
        {
          action: ANALYTIC_EVENT_NAMES.SEARCH,
          search: rawRestaurant,
          restaurants: restaurants.map((r) => r.name).join(' | '),
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
    const { chatId, firstName, lastName, data: restaurant } = getCallbackQueryData(callbackQuery);
    const logBody = `${TELEGRAM_EVENTS.CALLBACK_QUERY} :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - start`);

    try {
      const restaurantName = restaurant.replace('remove - ', '');
      const existingSubscription = (await this.mongoSubscriptionService.getSubscription(chatId, restaurantName)) as SubscriptionModel;

      if (restaurant.startsWith('remove - ')) {
        await this.handleCallbackRemoveSubscription(chatId, restaurantName, existingSubscription);
      } else {
        await this.handleCallbackAddSubscription(chatId, restaurantName, existingSubscription);
      }

      this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(`${this.callbackQueryHandler.name} - ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.WOLT,
        { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.callbackQueryHandler.name },
        chatId,
        this.mongoUserService,
      );
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async handleCallbackAddSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel): Promise<void> {
    if (existingSubscription) {
      const replyText = [`It seems you already have a subscription for ${restaurant} is open.`, `Let\'s wait a few minutes - it might open soon.`].join('\n\n');
      await this.bot.sendMessage(chatId, replyText);
      return;
    }

    const restaurantDetails = this.woltService.getRestaurantDetailsByName(restaurant);
    if (restaurantDetails?.isOnline) {
      const replyText = [`It looks like ${restaurant} is open now 🟢`, `Go ahead and order your food 🍴`].join('\n\n');
      const restaurantLinkUrl = getRestaurantLink(restaurantDetails);
      const inlineKeyboardButtons = [{ text: restaurantDetails.name, url: restaurantLinkUrl }];
      const form = getInlineKeyboardMarkup(inlineKeyboardButtons);
      await this.bot.sendMessage(chatId, replyText, form as any);
      return;
    }

    const replyText = [
      `No Problem, I will let you know once ${restaurant} is open 🚨`,
      `FYI: If the venue won't open within the next ${SUBSCRIPTION_EXPIRATION_HOURS} hours, registration will be removed`,
      `You can register for another restaurant if you like.`,
    ].join('\n\n');
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

  async handleCallbackRemoveSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel): Promise<void> {
    let replyText;
    if (existingSubscription) {
      const restaurantToRemove = restaurant.replace('remove - ', '');
      await this.mongoSubscriptionService.archiveSubscription(chatId, restaurantToRemove);
      replyText = `Subscription for ${restaurantToRemove} was removed`;
    } else {
      replyText = [`It seems like you don't have a subscription for ${restaurant} 🤔`, `You can search and register for another restaurant if you like`].join(
        '\n\n',
      );
    }
    await this.bot.sendMessage(chatId, replyText);
  }
}
