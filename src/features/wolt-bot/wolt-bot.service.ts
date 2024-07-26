import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import {
  ANALYTIC_EVENT_NAMES, INITIAL_BOT_RESPONSE,
  MAX_NUM_OF_RESTAURANTS_TO_SHOW,
  SUBSCRIPTION_EXPIRATION_HOURS, TOO_OLD_LIST_THRESHOLD_MS, WOLT_BOT_OPTIONS
} from '@services/wolt/wolt.config';
import { WoltService } from '@services/wolt/wolt.service';
import * as woltUtils from '@services/wolt/wolt.utils';
import { WoltMongoService } from '@core/mongo/wolt-mongo/wolt-mongo.service';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class WoltBotService implements OnModuleInit {
  private bot: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoService: WoltMongoService,
    private readonly woltService: WoltService,
    private readonly telegramBotsFactoryService: TelegramBotsFactoryService,
    private readonly telegramGeneralService: TelegramGeneralService,
  ) {}

  async onModuleInit() {
    this.bot = await this.telegramBotsFactoryService.getBot(BOTS.WOLT.name);
    this.logger.info('onModuleInit', 'WoltBotService has been initialized.');

    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'error', error));
  }

  createBotEventListeners() {
    this.bot.onText(/\/start/, this.startHandler);
    this.bot.onText(/\/show/, this.showHandler);
    this.bot.on('text', this.textHandler);
    this.bot.on('callback_query', this.callbackQueryHandler);
  }

  async startHandler(message) {
    const { chatId, firstName, lastName, telegramUserId, username } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      this.mongoService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, woltUtils.getKeyboardOptions());
      this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.START, { chatId });
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, woltUtils.getKeyboardOptions());
    }
  }

  async showHandler(message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `/\show :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.showHandler.name, `${logBody} - start`);

    try {
      const subscriptions = await this.mongoService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = 'You don\'t have any active subscriptions yet';
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, woltUtils.getKeyboardOptions());
      }

      const promisesArr = subscriptions.map(subscription => {
        const inlineKeyboardButtons = [
          { text: 'Remove', callback_data: `remove - ${subscription.restaurant}` },
        ];
        const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.telegramGeneralService.sendMessage(this.bot, chatId, subscription.restaurant, inlineKeyboardMarkup);
      });
      await Promise.all(promisesArr);
      this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SHOW, { chatId })
      this.logger.info(this.showHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.showHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, woltUtils.getKeyboardOptions());
    }
  }

  async textHandler(message) {
    const { chatId, firstName, lastName, text: rawRestaurant } = this.telegramGeneralService.getMessageData(message);
    const restaurant = rawRestaurant.toLowerCase();

    // prevent built in options to be processed also here
    if (Object.keys(WOLT_BOT_OPTIONS).map(option => WOLT_BOT_OPTIONS[option]).includes(restaurant)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SEARCH, { data: restaurant, chatId });

      const isLastUpdatedTooOld = new Date().getTime() - this.woltService.getLastUpdated() > TOO_OLD_LIST_THRESHOLD_MS;
      if (isLastUpdatedTooOld) { // lst updated is less than a minute
        await this.woltService.refreshRestaurants();
      }
      const matchedRestaurants = this.getFilteredRestaurantsByName(restaurant);
      if (!matchedRestaurants.length) {
        const replyText = `I am sorry, I didn\'t find any restaurants matching your search - '${restaurant}'`;
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, woltUtils.getKeyboardOptions());
      }
      const restaurants = await this.woltService.enrichRestaurants(matchedRestaurants);
      const inlineKeyboardButtons = restaurants.map(restaurant => {
        const isAvailableComment = restaurant.isOnline ? 'Open' : restaurant.isOpen ? 'Busy' : 'Closed';
        return {
          text: `${restaurant.name} - ${isAvailableComment}`,
          callback_data: restaurant.name,
        };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = 'Choose one of the above restaurants so I can notify you when it\'s online';
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, inlineKeyboardMarkup);
      this.logger.info(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, woltUtils.getKeyboardOptions());
    }
  }

  async callbackQueryHandler(callbackQuery) {
    const { chatId, firstName, lastName, data: restaurant } = this.telegramGeneralService.getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, restaurant: ${restaurant}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const restaurantName = restaurant.replace('remove - ', '');
      const existingSubscription = await this.mongoService.getSubscription(chatId, restaurantName);

      if (restaurant.startsWith('remove - ')) {
        return await this.handleCallbackRemoveSubscription(chatId, restaurantName, existingSubscription);
      }

      await this.handleCallbackAddSubscription(chatId, restaurant, existingSubscription);
      this.logger.info(this.callbackQueryHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.callbackQueryHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, woltUtils.getKeyboardOptions());
    }
  }

  async handleCallbackAddSubscription(chatId, restaurant, existingSubscription) {
    let replyText;
    let form = {};
    if (existingSubscription) {
      replyText = '' +
        `It seems you already have a subscription for ${restaurant} is open.\n\n` +
        `Let\'s wait a few minutes - it might open soon.`;
    } else {
      const restaurantDetails = this.woltService.getRestaurants().find(r => r.name === restaurant) || null;
      if (restaurantDetails && restaurantDetails.isOnline) {
        replyText = '' +
          `It looks like ${restaurant} is open now\n\n` +
          `Go ahead and order your food :)`;
        const restaurantLinkUrl = this.woltService.getRestaurantLink(restaurantDetails);
        const inlineKeyboardButtons = [
          { text: restaurantDetails.name, url: restaurantLinkUrl },
        ];
        form = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      } else {
        replyText = `No Problem, you will be notified once ${restaurant} is open.\n\n` +
          `FYI: If the venue won\'t open soon, registration will be removed after ${SUBSCRIPTION_EXPIRATION_HOURS} hours.\n\n` +
          `You can search and register for another restaurant if you like.`;
        await this.mongoService.addSubscription(chatId, restaurant, restaurantDetails.photo);
      }
    }

    this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SUBSCRIBE, { data: restaurant, chatId });
    await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, form);
  }

  async handleCallbackRemoveSubscription(chatId, restaurant, existingSubscription) {
    let replyText;
    if (existingSubscription) {
      const restaurantToRemove = restaurant.replace('remove - ', '');
      await this.mongoService.archiveSubscription(chatId, restaurantToRemove);
      replyText = `Subscription for ${restaurantToRemove} was removed`;
    } else {
      replyText = `It seems you don\'t have a subscription for ${restaurant}.\n\n` +
        `You can search and register for another restaurant if you like`;
    }
    this.mongoService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, { data: restaurant, chatId });
    return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, woltUtils.getKeyboardOptions());
  }

  getFilteredRestaurantsByName(searchInput) {
    const restaurants = [...this.woltService.getRestaurants()];
    return restaurants.filter(restaurant => {
      return restaurant.name.toLowerCase().includes(searchInput.toLowerCase());
    }).slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW);
  }
}
