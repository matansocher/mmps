import { SubscriptionModel } from '@core/mongo/stock-buddy-mongo/models';
import { StockDataSummary } from '@services/stock-buddy/interface';
import { StockBuddyService } from '@services/stock-buddy/stock-buddy.service';
import {
  ANALYTIC_EVENT_NAMES,
  BOT_BUTTONS_ACTIONS,
  INITIAL_BOT_RESPONSE,
  STOCK_BUDDY_BOT_OPTIONS
} from './stock-buddy-bot.config';
import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import {
  StockBuddyMongoAnalyticLogService,
  StockBuddyMongoSubscriptionService,
  StockBuddyMongoUserService,
} from '@core/mongo/stock-buddy-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
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
      this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
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
    const logBody = `/\show :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.showHandler.name, `${logBody} - start`);

    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = "You don't have any active subscriptions yet";
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const inlineKeyboardButtons = [
          { text: 'Remove', callback_data: `${BOT_BUTTONS_ACTIONS.UNSUBSCRIBE} - ${subscription.restaurant}` }, // $$$$$$$$$$$$ unsubscribe to a config
        ];
        const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
        return this.telegramGeneralService.sendMessage(this.bot, chatId, subscription.restaurant, inlineKeyboardMarkup);
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
    const { chatId, firstName, lastName, text: rawRestaurant } = this.telegramGeneralService.getMessageData(message);
    const stockSymbol = rawRestaurant.toLowerCase();

    // prevent built in options to be processed also here
    if (Object.keys(STOCK_BUDDY_BOT_OPTIONS).map((option: string) => STOCK_BUDDY_BOT_OPTIONS[option]).includes(stockSymbol)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, stockSymbol: ${stockSymbol}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.SEARCH, { data: stockSymbol, chatId });

      const stocksDetails = await this.stockBuddyService.getStockDetails(stockSymbol);
      if (!stocksDetails?.length) {
        const replyText = `I am sorry, I didn\'t find any restaurants matching your symbol - '${stockSymbol}'`;
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.stockBuddyBotUtilsService.getKeyboardOptions());
      }
      await Promise.all(
        stocksDetails.map((stockDetails: StockDataSummary) => {
          const inlineKeyboardButtons = [
            {
              text: `Subscribe to ${stockDetails.symbol}`,
              callback_data: `${BOT_BUTTONS_ACTIONS.SUBSCRIBE} - ${stockDetails.symbol}`, // $$$$$$$$$$$$ subscribe to a config
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
    return callbackQuery;
  }
}
