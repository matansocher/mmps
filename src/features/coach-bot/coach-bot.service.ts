import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getMessageData, MessageLoaderService, MessageLoaderOptions, TELEGRAM_EVENTS } from '@services/telegram';
import { CoachService } from './coach.service';
import { ANALYTIC_EVENT_STATES, COACH_BOT_OPTIONS, GENERAL_ERROR_RESPONSE, INITIAL_BOT_RESPONSE } from './constants';

@Injectable()
export class CoachBotService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotService.name);

  constructor(
    private readonly mongoUserService: CoachMongoUserService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly coachService: CoachService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.onText(new RegExp(COACH_BOT_OPTIONS.START), (message: Message) => this.startHandler(message));
    this.bot.onText(new RegExp(COACH_BOT_OPTIONS.SUBSCRIBE), (message: Message) => this.subscribeHandler(message));
    this.bot.onText(new RegExp(COACH_BOT_OPTIONS.UNSUBSCRIBE), (message: Message) => this.unsubscribeHandler(message));
    this.bot.on(TELEGRAM_EVENTS.TEXT, (message: Message) => this.textHandler(message));
  }

  async handleActionError(action: string, err: Error, chatId: number): Promise<void> {
    const errorMessage = `error: ${getErrorMessage(err)}`;
    this.logger.error(`${action} - ${errorMessage}`);
    await this.bot.sendMessage(chatId, GENERAL_ERROR_RESPONSE);
    this.notifierBotService.notify(BOTS.COACH, { action: `${action} - ${ANALYTIC_EVENT_STATES.ERROR}`, error: errorMessage }, chatId, this.mongoUserService);
  }

  async handleActionSuccess(action: string, chatId: number, notifierAdditionalData = {}): Promise<void> {
    this.logger.log(`${action} - success`);
    this.notifierBotService.notify(BOTS.COACH, { action: `${action} - ${ANALYTIC_EVENT_STATES.SUCCESS}`, ...notifierAdditionalData }, chatId, this.mongoUserService);
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, telegramUserId, firstName, lastName, username } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.startHandler.name} - ${logBody} - start`);
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.handleActionSuccess(ANALYTIC_EVENT_STATES.START, chatId);
    } catch (err) {
      this.handleActionError(this.startHandler.name, err, chatId);
    }
  }

  async subscribeHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.subscribeHandler.name} - ${logBody} - start`);
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `וואלה אני רואה שכבר שמת עוקב, אז הכל טוב ✅`);
        return;
      }
      await this.mongoSubscriptionService.addSubscription(chatId);
      await this.bot.sendMessage(chatId, `סבבה, אני אשלח לך עדכונים יומיים ✅. אפשר להסיר עוקב תמיד פה למטה (unsubscribe)`);
      this.handleActionSuccess(ANALYTIC_EVENT_STATES.SUBSCRIBE, chatId);
    } catch (err) {
      this.handleActionError(this.subscribeHandler.name, err, chatId);
    }
  }

  async unsubscribeHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.unsubscribeHandler.name} - ${logBody} - start`);
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `טוב אני רואה שעדיין לא שמת עוקב, לא סבבה 😁`);
        return;
      }
      await this.mongoSubscriptionService.archiveSubscription(chatId);
      await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
      this.handleActionSuccess(ANALYTIC_EVENT_STATES.UNSUBSCRIBE, chatId);
    } catch (err) {
      this.handleActionError(this.unsubscribeHandler.name, err, chatId);
    }
  }

  async sleep(ms) { // $$$$$$$$$$$$$$$$$
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(COACH_BOT_OPTIONS).some((option: string) => text.includes(COACH_BOT_OPTIONS[option]))) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(`${this.textHandler.name} - ${logBody} - start`);

    try {
      // const replyText = await this.coachService.getMatchesSummaryMessage(text);
      // await this.sendMarkdownMessage(chatId, replyText);
      // $$$$$$$$$$$$$$$$$$$$$$
      const messageLoaderService = new MessageLoaderService(this.bot, chatId, { cycleDuration: 3000 } as MessageLoaderOptions);
      await messageLoaderService.handleMessageWithLoader(async () => {
        // await this.sleep(3100);
        // await this.bot.sendMessage(chatId, `done`);
        const replyText = await this.coachService.getMatchesSummaryMessage(text);
        await this.sendMarkdownMessage(chatId, replyText);
      });

      this.handleActionSuccess(ANALYTIC_EVENT_STATES.SEARCH, chatId, { text });
    } catch (err) {
      this.handleActionError(this.textHandler.name, err, chatId);
    }
  }

  async sendMarkdownMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (err) {
      await this.bot.sendMessage(chatId, message);
    }
  }
}
