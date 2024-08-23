import { SubscriptionModel } from '@core/mongo/stock-buddy-mongo/models';
import { StockBuddyService } from '@services/stock-buddy/stock-buddy.service';
import { ANALYTIC_EVENT_NAMES, INITIAL_BOT_RESPONSE } from './stock-buddy-bot.config';
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
    @Inject(BOTS.WOLT.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.WOLT.name, 'error', error));
  }

  createBotEventListeners() {
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
          { text: 'Remove', callback_data: `remove - ${subscription.restaurant}` },
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
    return message;
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    return callbackQuery;
  }
}
