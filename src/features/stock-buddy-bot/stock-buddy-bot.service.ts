import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { SubscriptionModel } from '@core/mongo/stock-buddy-mongo/models';
import {
  StockBuddyMongoAnalyticLogService,
  StockBuddyMongoSubscriptionService,
  StockBuddyMongoUserService,
} from '@core/mongo/stock-buddy-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { StockDataSummary } from '@services/stock-buddy/interface';
import { StockBuddyService } from '@services/stock-buddy/stock-buddy.service';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { IInlineButtonCompanyDetails } from './interface';
import { ANALYTIC_EVENT_NAMES, BOT_BUTTONS_ACTIONS, INITIAL_BOT_RESPONSE, STOCK_BUDDY_BOT_OPTIONS } from './stock-buddy-bot.config';
import { StockBuddyBotUtilsService } from './stock-buddy-bot-utils.service';

@Injectable()
export class StockBuddyBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly stockBuddyBotUtilsService: StockBuddyBotUtilsService,
    private readonly stockBuddyService: StockBuddyService,
    private readonly mongoUserService: StockBuddyMongoUserService,
    private readonly mongoAnalyticLogService: StockBuddyMongoAnalyticLogService,
    private readonly mongoSubscriptionService: StockBuddyMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.STOCK_BUDDY.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.STOCK_BUDDY.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.STOCK_BUDDY.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/show/, (message: Message) => this.showHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
    this.bot.on('callback_query', (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
      this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.START, { chatId });
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, this.stockBuddyBotUtilsService.getKeyboardOptions());
    }
  }

  async showHandler(message: Message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `show :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.showHandler.name, `${logBody} - start`);

    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `You don't have any active subscriptions yet`;
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.UNSUBSCRIBE, symbol: subscription.symbol } as IInlineButtonCompanyDetails;
        const inlineKeyboardButtons = [
          {
            text: 'Unsubscribe',
            callback_data: JSON.stringify(callbackData),
          },
        ];
        const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.telegramGeneralService.sendMessage(this.bot, chatId, subscription.symbol, inlineKeyboardMarkup);
      });
      await Promise.all(promisesArr);
      this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SHOW, { chatId });
      this.logger.info(this.showHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.showHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, this.stockBuddyBotUtilsService.getKeyboardOptions());
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = this.telegramGeneralService.getMessageData(message);
    const searchTerm = text.toLowerCase();

    // prevent built in options to be processed also here
    if (Object.keys(STOCK_BUDDY_BOT_OPTIONS).map((option: string) => STOCK_BUDDY_BOT_OPTIONS[option]).includes(searchTerm)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, searchTerm: ${searchTerm}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SEARCH, { data: searchTerm, chatId });

      const stocksDetails = await this.stockBuddyService.getStockDetails(searchTerm);
      if (!stocksDetails?.length) {
        const replyText = `I am sorry, I didn\'t find any restaurants matching your symbol - '${searchTerm}'`;
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
      }
      await Promise.all(
        stocksDetails.map((stockDetails: StockDataSummary) => {
          // const callbackData = { action: BOT_BUTTONS_ACTIONS.SUBSCRIBE } as IInlineButtonCompanyDetails;
          const callbackData = { action: BOT_BUTTONS_ACTIONS.SUBSCRIBE, symbol: stockDetails.symbol } as IInlineButtonCompanyDetails;
          const inlineKeyboardButtons = [
            {
              text: `Subscribe to ${stockDetails.symbol}`,
              callback_data: JSON.stringify(callbackData),
            },
          ];
          const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
          const messageText = this.stockBuddyBotUtilsService.getStockSummaryMessage(stockDetails);
          return this.telegramGeneralService.sendMessage(this.bot, chatId, messageText, { ...inlineKeyboardMarkup, parse_mode: 'MarkdownV2' });
        }),
      );
      this.logger.info(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, this.stockBuddyBotUtilsService.getKeyboardOptions());
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data } = this.telegramGeneralService.getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const { action, symbol } = JSON.parse(data) as IInlineButtonCompanyDetails;
      const existingSubscription = (await this.mongoSubscriptionService.getSubscription(chatId, symbol)) as SubscriptionModel;

      switch (action) {
        case BOT_BUTTONS_ACTIONS.SUBSCRIBE: {
          await this.handleCallbackAddSubscription(chatId, symbol, existingSubscription);
          break;
        }
        case BOT_BUTTONS_ACTIONS.UNSUBSCRIBE: {
          await this.handleCallbackRemoveSubscription(chatId, { symbol }, existingSubscription);
          break;
        }
      }
      this.logger.info(this.callbackQueryHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.callbackQueryHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, this.stockBuddyBotUtilsService.getKeyboardOptions());
    }
  }

  async handleCallbackAddSubscription(chatId: number, symbol: string, existingSubscription: SubscriptionModel) {
    let replyText;
    if (existingSubscription) {
      // send a message telling that there is already a subscription for that symbol
      replyText = `You are already subscribed to ${symbol}`;
    } else {
      replyText = `No Problem, you will be notified every day to check ${symbol} status`;
      const stockDetails = await this.stockBuddyService.getStockDetails(symbol);
      await this.mongoSubscriptionService.addSubscription(chatId, symbol, stockDetails[0].longName);
    }

    this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SUBSCRIBE, { data: symbol, chatId });
    await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
  }

  async handleCallbackRemoveSubscription(chatId: number, { symbol }, existingSubscription: SubscriptionModel) {
    let replyText;
    if (existingSubscription) {
      await this.mongoSubscriptionService.archiveSubscription(chatId, symbol);
      replyText = `Subscription for ${symbol} was removed`;
    } else {
      replyText = `It seems you don\'t have a subscription for ${symbol}.\n\nYou can search and register for another stock if you like`;
    }
    this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, { data: symbol, chatId });
    return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
  }
}
