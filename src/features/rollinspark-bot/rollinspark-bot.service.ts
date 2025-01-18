import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RollinsparkMongoSubscriptionService, RollinsparkMongoUserService } from '@core/mongo/rollinspark-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData } from '@services/telegram';
import { ANALYTIC_EVENT_STATES, BOT_ACTIONS, NAME_TO_PLAN_ID_MAP } from './constants';

@Injectable()
export class RollinsparkBotService implements OnModuleInit {
  private readonly logger = new Logger(RollinsparkMongoSubscriptionService.name);

  constructor(
    private readonly mongoUserService: RollinsparkMongoUserService,
    private readonly mongoSubscriptionService: RollinsparkMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.ROLLINSPARK.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/management/, (message: Message) => this.managementHandler(message));
    this.bot.on('callback_query', (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async handleActionError(action: string, logBody: string, err: Error, chatId: number): Promise<void> {
    const errorMessage = `error: ${getErrorMessage(err)}`;
    this.logger.error(action, `${logBody} - ${errorMessage}`);
    await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    this.notifierBotService.notify(BOTS.ROLLINSPARK, { action: `${action} - ${ANALYTIC_EVENT_STATES.ERROR}`, error: errorMessage }, chatId, this.mongoUserService);
  }

  async handleActionSuccess(action: string, logBody: string, chatId: number, replyText: string, form = {}): Promise<void> {
    await this.bot.sendMessage(chatId, replyText, form);
    this.logger.log(action, `${logBody} - success`);
    this.notifierBotService.notify(BOTS.ROLLINSPARK, { action: `${action} - ${ANALYTIC_EVENT_STATES.SUCCESS}` }, chatId, this.mongoUserService);
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, telegramUserId, firstName, lastName, username } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      this.logger.log(this.startHandler.name, `${logBody} - start`);
      const replyText = `Hello, I am bot that can you know when I find a new apartment uploaded to the rollins park neighborhood website.\n\nJust let me know what plan of an apartment you want and I will look it up for you`;
      return this.handleActionSuccess(this.startHandler.name, logBody, chatId, replyText);
    } catch (err) {
      return this.handleActionError(this.startHandler.name, logBody, err, chatId);
    }
  }

  async managementHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.managementHandler.name, `${logBody} - start`);

      const subscriptions = await this.mongoSubscriptionService.getSubscriptions(chatId);
      const inlineKeyboardButtons = Object.keys(NAME_TO_PLAN_ID_MAP)
        .map((planName) => {
          const subscription = subscriptions.find((sub) => sub.planId === NAME_TO_PLAN_ID_MAP[planName] && sub.isActive);
          const isSubscribed = !!subscription;
          return {
            text: `${planName} - ${isSubscribed ? 'Unsubscribe 🛑' : 'Subscribe 🟢'}`,
            callback_data: `${NAME_TO_PLAN_ID_MAP[planName]} - ${isSubscribed ? BOT_ACTIONS.UNSUBSCRIBE : BOT_ACTIONS.SUBSCRIBE}`,
          };
        })
        .sort((a, b) => a.text.localeCompare(b.text));
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      const replyText = `Here is the full list of plans I support in rollinspark.\nPlease choose the relevant options for you`;
      return this.handleActionSuccess(this.managementHandler.name, logBody, chatId, replyText, inlineKeyboardMarkup);
    } catch (err) {
      return this.handleActionError(this.managementHandler.name, logBody, err, chatId);
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: response } = getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, response: ${response}`;
    this.logger.log(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const [planId, action] = response.split(' - ');
      switch (action) {
        case BOT_ACTIONS.SUBSCRIBE:
          await this.handleCallbackAddSubscription(logBody, chatId, +planId);
          break;
        case BOT_ACTIONS.UNSUBSCRIBE:
          await this.handleCallbackRemoveSubscription(logBody, chatId, +planId);
          break;
        default:
          throw new Error('Invalid action');
      }
      this.logger.log(this.callbackQueryHandler.name, `${logBody} - success`);
    } catch (err) {
      return this.handleActionError(this.callbackQueryHandler.name, logBody, err, chatId);
    }
  }

  async handleCallbackAddSubscription(logBody: string, chatId: number, planId: number) {
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId, planId);
    if (subscription) {
      const replyText = `You are already subscribed, don't worry, I will let you know once I find something new`;
      return this.handleActionSuccess(this.handleCallbackAddSubscription.name, logBody, chatId, replyText);
    }
    await this.mongoSubscriptionService.addSubscription(chatId, planId);
    const replyText = `OK, I will let you know once I find a new apartment posted`;
    return this.handleActionSuccess(this.handleCallbackAddSubscription.name, logBody, chatId, replyText);
  }

  async handleCallbackRemoveSubscription(logBody: string, chatId: number, planId: number) {
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId, planId);
    if (!subscription) {
      const replyText = `I dont see you are subscribed to that plan, so no reason to unsubscribe`;
      return this.handleActionSuccess(this.handleCallbackRemoveSubscription.name, logBody, chatId, replyText);
    }
    await this.mongoSubscriptionService.archiveSubscription(chatId, planId);
    const replyText = `OK, I have unsubscribed you from the notifications`;
    return this.handleActionSuccess(this.handleCallbackRemoveSubscription.name, logBody, chatId, replyText);
  }
}
