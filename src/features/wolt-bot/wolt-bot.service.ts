import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubscriptionModel, WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, TELEGRAM_EVENTS } from '@services/telegram';
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
    this.bot.onText(new RegExp(WOLT_BOT_COMMANDS.START.command), (message: Message) => this.startHandler(message));
    this.bot.onText(new RegExp(WOLT_BOT_COMMANDS.LIST.command), (message: Message) => this.listHandler(message));
    this.bot.on(TELEGRAM_EVENTS.TEXT, (message: Message) => this.textHandler(message));
    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.startHandler.name} - ${logBody} - start`);
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.bot.sendMessage(chatId, replyText);
      this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      this.logger.log(`${this.startHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(`${this.startHandler.name} - ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.WOLT,
        { action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.startHandler.name },
        chatId,
        this.mongoUserService,
      );
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async listHandler(message: Message) {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `list :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.log(`${this.listHandler.name} - ${logBody} - start`);

    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `You don't have any active subscriptions yet`;
        return await this.bot.sendMessage(chatId, replyText);
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const inlineKeyboardButtons = [{ text: 'Remove', callback_data: `remove - ${subscription.restaurant}` }];
        const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.bot.sendMessage(chatId, subscription.restaurant, inlineKeyboardMarkup as any);
      });
      await Promise.all(promisesArr);
      this.logger.log(`${this.listHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(`${this.listHandler.name} - ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.WOLT,
        { action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.listHandler.name },
        chatId,
        this.mongoUserService,
      );
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text: rawRestaurant } = getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase().trim();

    // prevent built in options to be processed also here
    if (Object.values(WOLT_BOT_COMMANDS).some((command: BotCommand) => restaurant.includes(command.command))) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.log(`${this.textHandler.name} - ${logBody} - start`);

    try {
      const isLastUpdatedTooOld = new Date().getTime() - this.woltService.getLastUpdated() > TOO_OLD_LIST_THRESHOLD_MS;
      if (isLastUpdatedTooOld) {
        await this.woltService.refreshRestaurants();
      }
      const matchedRestaurants = this.woltService.getFilteredRestaurantsByName(restaurant);
      if (!matchedRestaurants.length) {
        const replyText = `I am sorry, I didn't find any restaurants matching your search - '${restaurant}'`;
        return await this.bot.sendMessage(chatId, replyText);
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
      this.logger.log(`${this.textHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(`${this.textHandler.name} - ${errorMessage}`);
      this.notifierBotService.notify(
        BOTS.WOLT,
        { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.textHandler.name },
        chatId,
        this.mongoUserService,
      );
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
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

  async handleCallbackAddSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel) {
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

  async handleCallbackRemoveSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel) {
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
    return await this.bot.sendMessage(chatId, replyText);
  }
}
