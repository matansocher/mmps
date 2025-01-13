import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { getErrorMessage } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData } from '@services/telegram';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { NotifierBotService } from '@core/notifier-bot';

const ANALYTIC_EVENT_STATES = {
  START: 'START',
  SEARCH: 'SEARCH',
  ERROR: 'ERROR',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  SUCCESS: 'SUCCESS',
};

const COACH_BOT_OPTIONS = {
  START: '/start',
  SUBSCRIBE: '/subscribe',
  UNSUBSCRIBE: '/unsubscribe',
};

@Injectable()
export class CoachBotService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotService.name);

  constructor(
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly mongoUserService: CoachMongoUserService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly coachBotSchedulerService: CoachBotSchedulerService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.COACH.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.COACH.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/subscribe/, (message: Message) => this.subscribeHandler(message));
    this.bot.onText(/\/unsubscribe/, (message: Message) => this.unsubscribeHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, telegramUserId, firstName, lastName, username } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.startHandler.name, `${logBody} - start`);
      this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const INITIAL_BOT_RESPONSE = [`Hey There 👋`, `I am here to provide you with results of football matches.`].join('\n\n');
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.START}` }, chatId, this.mongoUserService);
      this.logger.log(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, 'Sorry, I am unable to process your request at the moment. Please try again later.');
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.START} - ${ANALYTIC_EVENT_STATES.ERROR}` }, chatId, this.mongoUserService);
    }
  }

  async subscribeHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.subscribeHandler.name, `${logBody} - start`);
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `I see you are already subscribe.\n Don't worry, I will send you games summaries`);
      }
      await this.mongoSubscriptionService.addSubscription(chatId);
      await this.bot.sendMessage(chatId, `OK, I will send you games summaries every day.\nYou can always ask me to stop by clicking on the unsubscribe command`);
      this.logger.log(this.subscribeHandler.name, `${logBody} - success`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.SUBSCRIBE}` }, chatId, this.mongoUserService);
    } catch (err) {
      this.logger.error(this.subscribeHandler.name, `${logBody} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, 'Sorry, I am unable to process your request at the moment. Please try again later.');
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.SUBSCRIBE} - ${ANALYTIC_EVENT_STATES.ERROR}` }, chatId, this.mongoUserService);
    }
  }

  async unsubscribeHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.unsubscribeHandler.name, `${logBody} - start`);
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `I see you are not subscribed yet 😁`);
      }
      await this.mongoSubscriptionService.archiveSubscription(chatId);
      await this.bot.sendMessage(chatId, `OK, I will stop sending you games summaries every day`);
      this.logger.log(this.unsubscribeHandler.name, `${logBody} - success`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.UNSUBSCRIBE}` }, chatId, this.mongoUserService);
    } catch (err) {
      this.logger.error(this.unsubscribeHandler.name, `${logBody} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, 'Sorry, I am unable to process your request at the moment. Please try again later.');
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.UNSUBSCRIBE} - ${ANALYTIC_EVENT_STATES.ERROR}` }, chatId, this.mongoUserService);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(COACH_BOT_OPTIONS).map((option: string) => COACH_BOT_OPTIONS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(this.textHandler.name, `${logBody} - start`);

    try {
      await this.coachBotSchedulerService.handleIntervalFlow(text);
      this.logger.log(this.textHandler.name, `${logBody} - success`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.SEARCH}`, text }, chatId, this.mongoUserService);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.SEARCH} - ${ANALYTIC_EVENT_STATES.ERROR}` }, chatId, this.mongoUserService);
    }
  }
}
