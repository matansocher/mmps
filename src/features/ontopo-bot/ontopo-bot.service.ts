import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { OntopoMongoAnalyticLogService, OntopoMongoSubscriptionService, OntopoMongoUserService, SubscriptionModel } from '@core/mongo/ontopo-mongo';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import {
  ANALYTIC_EVENT_NAMES,
  BOT_BUTTONS_ACTIONS,
  INITIAL_BOT_RESPONSE,
  ONTOPO_BOT_COMMANDS,
  FlowStepsHandlerService,
  FlowStepsManagerService,
  OntopoUtilsService,
} from '@services/ontopo';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class OntopoBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoUserService: OntopoMongoUserService,
    private readonly mongoAnalyticLogService: OntopoMongoAnalyticLogService,
    private readonly mongoSubscriptionService: OntopoMongoSubscriptionService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly flowStepsHandlerService: FlowStepsHandlerService,
    private readonly ontopoUtilsService: OntopoUtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.ONTOPO.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.ONTOPO.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.ONTOPO.name, 'error', error));
  }

  createBotEventListeners() {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/show/, (message: Message) => this.showHandler(message));
    this.bot.onText(/\/reset/, (message: Message) => this.resetHandler(message));
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
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      this.notifierBotService.notify(BOTS.ONTOPO.name, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
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
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const { text, inlineKeyboardMarkup } = this.ontopoUtilsService.getSubscriptionDetails(subscription);
        // return this.telegramGeneralService.sendPhoto(this.bot, subscription.chatId, subscription.restaurantDetails.image, { ...inlineKeyboardMarkup, caption: resText });
        return this.telegramGeneralService.sendMessage(this.bot, subscription.chatId, text, inlineKeyboardMarkup);
      });
      await Promise.all(promisesArr);
      this.logger.info(this.showHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.showHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  async resetHandler(message: Message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `reset :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.resetHandler.name, `${logBody} - start`);

    try {
      this.flowStepsManagerService.resetCurrentUserStep(chatId);
      const replyText = `OK, let's start over`;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      this.logger.info(this.resetHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.resetHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = this.telegramGeneralService.getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(ONTOPO_BOT_COMMANDS).map((option: string) => ONTOPO_BOT_COMMANDS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      await this.processFlowStep(this.bot, chatId, text);
      this.logger.info(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: buttonData } = this.telegramGeneralService.getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, buttonData: ${buttonData}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const { action, data } = this.ontopoUtilsService.convertCallbackDataToInlineKeyboardButton(buttonData);

      switch (action) {
        case BOT_BUTTONS_ACTIONS.UNSUBSCRIBE: {
          await this.handleCallbackRemoveSubscription(chatId, { subscriptionId: data });
          break;
        }
        case BOT_BUTTONS_ACTIONS.DATE:
        case BOT_BUTTONS_ACTIONS.TIME:
        case BOT_BUTTONS_ACTIONS.SIZE:
        case BOT_BUTTONS_ACTIONS.AREA: {
          await this.processFlowStep(this.bot, chatId, data);
          break;
        }
      }
      this.logger.info(this.callbackQueryHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.callbackQueryHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  async processFlowStep(bot: TelegramBot, chatId: number, currentStepUserInput: string): Promise<void> {
    await this.flowStepsHandlerService.handleStep(bot, chatId, currentStepUserInput);
  }

  async handleCallbackRemoveSubscription(chatId: number, { subscriptionId }) {
    let replyText;
    const existingSubscription = (await this.mongoSubscriptionService.getSubscription(chatId, subscriptionId)) as SubscriptionModel;
    if (existingSubscription) {
      await this.mongoSubscriptionService.archiveSubscription(chatId, subscriptionId);
      replyText = `Subscription for ${existingSubscription.restaurantDetails.title} at ${this.ontopoUtilsService.getDateStringFormat(existingSubscription.userSelections.date)} was removed`;
    } else {
      replyText = `It seems you don\'t have a subscription for this restaurant.\n\nYou can search and register for another restaurant if you like`;
    }
    this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, { data: subscriptionId, chatId });
    return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
  }
}
