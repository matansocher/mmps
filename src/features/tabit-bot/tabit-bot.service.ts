import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { SubscriptionModel } from '@core/mongo/tabit-mongo/models';
import { TabitMongoAnalyticLogService, TabitMongoSubscriptionService, TabitMongoUserService } from '@core/mongo/tabit-mongo/services';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils/utils.service';
import { IInlineKeyboardButton } from '@services/tabit/interface';
import { FlowStepsHandlerService } from '@services/tabit/tabit-flow/flow-steps-handler.service';
import {
  convertCallbackDataToInlineKeyboardButton,
  convertInlineKeyboardButtonToCallbackData,
  getGeneralKeyboardOptions,
} from '@services/tabit/tabit.utils';
import { ANALYTIC_EVENT_NAMES, BOT_BUTTONS_ACTIONS, INITIAL_BOT_RESPONSE, TABIT_BOT_OPTIONS } from '@services/tabit/tabit.config';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class TabitBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoUserService: TabitMongoUserService,
    private readonly mongoAnalyticLogService: TabitMongoAnalyticLogService,
    private readonly mongoSubscriptionService: TabitMongoSubscriptionService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly flowStepsHandlerService: FlowStepsHandlerService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.TABIT.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TABIT.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TABIT.name, 'error', error));
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
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, getGeneralKeyboardOptions());
      this.notifierBotService.notify(BOTS.TABIT.name, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
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
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      }

      const promisesArr = subscriptions.map((subscription: SubscriptionModel) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.UNSUBSCRIBE, data: subscription._id.toString() } as IInlineKeyboardButton;
        const { restaurantDetails, userSelections } = subscription;
        const inlineKeyboardButtons = [
          {
            text: `Unsubscribe`,
            callback_data: convertInlineKeyboardButtonToCallbackData(callbackData),
          },
        ];
        const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
        const resTextDetails = [
          `🧑‍🍳 ${restaurantDetails.title}`,
          `⏰ ${userSelections.date} - ${userSelections.time}`,
          `🪑 ${userSelections.numOfSeats}`,
          `⛺️ ${userSelections.area}`,
        ];
        const resText = resTextDetails.join('\n');
        // return this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
        // return this.telegramGeneralService.sendPhoto(this.bot, chatId, resText, inlineKeyboardMarkup);

        return this.telegramGeneralService.sendPhoto(this.bot, subscription.chatId, subscription.restaurantDetails.image, { ...inlineKeyboardMarkup, caption: resText });
      });
      await Promise.all(promisesArr);
      this.logger.info(this.showHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.showHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = this.telegramGeneralService.getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TABIT_BOT_OPTIONS).map((option: string) => TABIT_BOT_OPTIONS[option]).includes(text)) return;

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

  async processFlowStep(bot: TelegramBot, chatId: number, currentStepUserInput: string): Promise<void> {
    await this.flowStepsHandlerService.handleStep(bot, chatId, currentStepUserInput);
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: buttonData } = this.telegramGeneralService.getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const { action, data } = convertCallbackDataToInlineKeyboardButton(buttonData);

      switch (action) {
        case BOT_BUTTONS_ACTIONS.UNSUBSCRIBE: {
          await this.handleCallbackRemoveSubscription(chatId, { subscriptionId: data });
          break;
        }
        case BOT_BUTTONS_ACTIONS.DATE:
        case BOT_BUTTONS_ACTIONS.TIME:
        case BOT_BUTTONS_ACTIONS.NUM_OF_SEATS:
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

  async handleCallbackRemoveSubscription(chatId: number, { subscriptionId }) {
    let replyText;
    const existingSubscription = (await this.mongoSubscriptionService.getSubscription(chatId, subscriptionId)) as SubscriptionModel;
    if (existingSubscription) {
      await this.mongoSubscriptionService.archiveSubscription(chatId, subscriptionId);
      replyText = `Subscription for ${existingSubscription.restaurantDetails.title} at ${existingSubscription.userSelections.date} was removed`;
    } else {
      replyText = `It seems you don\'t have a subscription for this restaurant.\n\nYou can search and register for another restaurant if you like`;
    }
    this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, { data: subscriptionId, chatId });
    return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
  }
}
