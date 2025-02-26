import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { BOTS, getMessageData, MessageLoader, sendStyledMessage, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { ANALYTIC_EVENT_STATES, COACH_BOT_COMMANDS, CUSTOM_ERROR_MESSAGE, INITIAL_BOT_RESPONSE } from './coach-bot.config';
import { CoachService } from './coach.service';

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
    this.bot.setMyCommands(Object.values(COACH_BOT_COMMANDS));

    const { COMMAND, TEXT } = TELEGRAM_EVENTS;
    const { START, SUBSCRIBE, UNSUBSCRIBE } = COACH_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: SUBSCRIBE.command, handler: (message) => this.subscribeHandler.call(this, message) },
      { event: COMMAND, regex: UNSUBSCRIBE.command, handler: (message) => this.unsubscribeHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage: CUSTOM_ERROR_MESSAGE });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.mongoUserService.saveUserDetails(userDetails);
    await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.START }, userDetails);
  }

  private async subscribeHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    if (subscription) {
      await this.bot.sendMessage(chatId, `וואלה אני רואה שכבר שמת עוקב, אז הכל טוב ✅`);
      return;
    }
    await this.mongoSubscriptionService.addSubscription(chatId);
    await this.bot.sendMessage(chatId, `סבבה, אני אשלח לך עדכונים יומיים ✅. אפשר להסיר עוקב תמיד פה למטה (unsubscribe)`);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.SUBSCRIBE }, userDetails);
  }

  private async unsubscribeHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    if (subscription) {
      await this.bot.sendMessage(chatId, `טוב אני רואה שעדיין לא שמת עוקב, לא סבבה 😁`);
      return;
    }
    await this.mongoSubscriptionService.archiveSubscription(chatId);
    await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.UNSUBSCRIBE }, userDetails);
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(COACH_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '⚽️' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const replyText = await this.coachService.getMatchesSummaryMessage(text);
      await sendStyledMessage(this.bot, chatId, replyText);
    });

    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.SEARCH, text }, userDetails);
  }
}
