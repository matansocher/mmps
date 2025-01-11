import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { NotifierBotService } from '@core/notifier-bot';
import { WoltMongoSubscriptionService, WoltMongoUserService, SubscriptionModel } from '@core/mongo/wolt-mongo';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData, getCallbackQueryData, getInlineKeyboardMarkup } from '@services/telegram';
import {
  ANALYTIC_EVENT_NAMES,
  CITIES_SLUGS_SUPPORTED,
  INITIAL_BOT_RESPONSE,
  MAX_NUM_OF_RESTAURANTS_TO_SHOW,
  SUBSCRIPTION_EXPIRATION_HOURS,
  TOO_OLD_LIST_THRESHOLD_MS,
  WOLT_BOT_OPTIONS,
  IWoltRestaurant,
  WoltService,
  WoltUtilsService,
} from '@services/wolt';

@Injectable()
export class WoltBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly woltUtilsService: WoltUtilsService,
    private readonly woltService: WoltService,
    private readonly mongoUserService: WoltMongoUserService,
    private readonly mongoSubscriptionService: WoltMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.WOLT.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/list/, (message: Message) => this.listHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
    this.bot.on('callback_query', (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.bot.sendMessage(chatId, replyText, this.woltUtilsService.getKeyboardOptions());
      this.notifierBotService.notify(BOTS.WOLT.name, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.startHandler.name, errorMessage);
      this.notifierBotService.notify(BOTS.WOLT.name, { action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.startHandler.name }, chatId, this.mongoUserService);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`, this.woltUtilsService.getKeyboardOptions());
    }
  }

  async listHandler(message: Message) {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `list :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.listHandler.name, `${logBody} - start`);

    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `You don't have any active subscriptions yet`;
        return await this.bot.sendMessage(chatId, replyText, this.woltUtilsService.getKeyboardOptions());
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const inlineKeyboardButtons = [
          { text: 'Remove', callback_data: `remove - ${subscription.restaurant}` },
        ];
        const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.bot.sendMessage(chatId, subscription.restaurant, inlineKeyboardMarkup as any);
      });
      await Promise.all(promisesArr);
      this.logger.info(this.listHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.listHandler.name, errorMessage);
      this.notifierBotService.notify(BOTS.WOLT.name, { action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.listHandler.name }, chatId, this.mongoUserService);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`, this.woltUtilsService.getKeyboardOptions());
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text: rawRestaurant } = getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase();

    // prevent built in options to be processed also here
    if (Object.keys(WOLT_BOT_OPTIONS).map((option: string) => WOLT_BOT_OPTIONS[option]).includes(restaurant)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      const isLastUpdatedTooOld = new Date().getTime() - this.woltService.getLastUpdated() > TOO_OLD_LIST_THRESHOLD_MS;
      if (isLastUpdatedTooOld) {
        await this.woltService.refreshRestaurants();
      }
      const matchedRestaurants = this.getFilteredRestaurantsByName(restaurant);
      if (!matchedRestaurants.length) {
        const replyText = `I am sorry, I didn't find any restaurants matching your search - '${restaurant}'`;
        return await this.bot.sendMessage(chatId, replyText, this.woltUtilsService.getKeyboardOptions());
      }
      const restaurants = await this.woltService.enrichRestaurants(matchedRestaurants);
      const inlineKeyboardButtons = restaurants.map((restaurant) => {
        const isAvailableComment = restaurant.isOnline ? 'Open' : restaurant.isOpen ? 'Busy' : 'Closed';
        return {
          text: `${restaurant.name} - ${isAvailableComment}`,
          callback_data: restaurant.name,
        };
      });
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `Choose one of the above restaurants so I can notify you when it's online`;
      await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup as any);
      this.notifierBotService.notify(BOTS.WOLT.name, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: restaurants.map((r) => r.name).join(' | ') }, chatId, this.mongoUserService);
      this.logger.info(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.textHandler.name, errorMessage);
      this.notifierBotService.notify(BOTS.WOLT.name, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.textHandler.name }, chatId, this.mongoUserService);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`, this.woltUtilsService.getKeyboardOptions());
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: restaurant } = getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const restaurantName = restaurant.replace('remove - ', '');
      const existingSubscription = (await this.mongoSubscriptionService.getSubscription(chatId, restaurantName)) as SubscriptionModel;

      if (restaurant.startsWith('remove - ')) {
        await this.handleCallbackRemoveSubscription(chatId, restaurantName, existingSubscription);
      } else {
        await this.handleCallbackAddSubscription(chatId, restaurant, existingSubscription);
      }

      this.logger.info(this.callbackQueryHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.callbackQueryHandler.name, errorMessage);
      this.notifierBotService.notify(BOTS.WOLT.name, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.callbackQueryHandler.name }, chatId, this.mongoUserService);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`, this.woltUtilsService.getKeyboardOptions());
    }
  }

  async handleCallbackAddSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel) {
    let replyText;
    let form = {};
    if (existingSubscription) {
      replyText = '' +
        `It seems you already have a subscription for ${restaurant} is open.\n\n` +
        `Let\'s wait a few minutes - it might open soon.`;
    } else {
      const restaurantDetails = this.woltService.getRestaurants().find((r: IWoltRestaurant): boolean => r.name === restaurant) || null;
      if (restaurantDetails && restaurantDetails.isOnline) {
        replyText = '' +
          `It looks like ${restaurant} is open now\n\n` +
          `Go ahead and order your food :)`;
        const restaurantLinkUrl = this.woltService.getRestaurantLink(restaurantDetails);
        const inlineKeyboardButtons = [
          { text: restaurantDetails.name, url: restaurantLinkUrl },
        ];
        form = getInlineKeyboardMarkup(inlineKeyboardButtons);
      } else {
        replyText = `No Problem, I will let you know once ${restaurant} is open\n\n` +
          `FYI: If the venue won't open within the next ${SUBSCRIPTION_EXPIRATION_HOURS} hours, registration will be removed\n\n` +
          `You can register for another restaurant if you like.`;
        await this.mongoSubscriptionService.addSubscription(chatId, restaurant, restaurantDetails.photo);
      }
    }

    await this.bot.sendMessage(chatId, replyText, form);
  }

  async handleCallbackRemoveSubscription(chatId: number, restaurant: string, existingSubscription: SubscriptionModel) {
    let replyText;
    if (existingSubscription) {
      const restaurantToRemove = restaurant.replace('remove - ', '');
      await this.mongoSubscriptionService.archiveSubscription(chatId, restaurantToRemove);
      replyText = `Subscription for ${restaurantToRemove} was removed`;
    } else {
      replyText = `It seems like you don't have a subscription for ${restaurant}.\n\n` +
        `You can search and register for another restaurant if you like`;
    }
    return await this.bot.sendMessage(chatId, replyText, this.woltUtilsService.getKeyboardOptions());
  }

  getFilteredRestaurantsByName(searchInput) {
    const restaurants = [...this.woltService.getRestaurants()];
    return restaurants
      .filter((restaurant: IWoltRestaurant) => {
        return restaurant.name.toLowerCase().includes(searchInput.toLowerCase());
      })
      .sort((a: IWoltRestaurant, b: IWoltRestaurant) => {
        // sort by the order of areas in CITIES_SLUGS_SUPPORTED
        return CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area);
      })
      .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW);
  }
}
