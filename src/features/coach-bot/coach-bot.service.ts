import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { BOTS, getMessageData, MessageLoader, sendStyledMessage, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram/utils/register-handlers';
import { ANALYTIC_EVENT_STATES, COACH_BOT_COMMANDS, CUSTOM_ERROR_MESSAGE, INITIAL_BOT_RESPONSE } from './coach-bot.config';
import { CoachService } from './coach.service';

@Injectable()
export class CoachBotService implements OnModuleInit {
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
    registerHandlers({ bot: this.bot, logger: new Logger(BOTS.COACH.id), handlers, customErrorMessage: CUSTOM_ERROR_MESSAGE });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const { telegramUserId, firstName, lastName, username } = getMessageData(message);
    await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
    await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.START }, chatId, this.mongoUserService);
  }

  private async subscribeHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    if (subscription) {
      await this.bot.sendMessage(chatId, `וואלה אני רואה שכבר שמת עוקב, אז הכל טוב ✅`);
      return;
    }
    await this.mongoSubscriptionService.addSubscription(chatId);
    await this.bot.sendMessage(chatId, `סבבה, אני אשלח לך עדכונים יומיים ✅. אפשר להסיר עוקב תמיד פה למטה (unsubscribe)`);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.SUBSCRIBE }, chatId, this.mongoUserService);
  }

  private async unsubscribeHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    if (subscription) {
      await this.bot.sendMessage(chatId, `טוב אני רואה שעדיין לא שמת עוקב, לא סבבה 😁`);
      return;
    }
    await this.mongoSubscriptionService.archiveSubscription(chatId);
    await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.UNSUBSCRIBE }, chatId, this.mongoUserService);
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(COACH_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '⚽️' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const replyText = await this.coachService.getMatchesSummaryMessage(text);
      await sendStyledMessage(this.bot, chatId, replyText);
    });

    this.notifierBotService.notify(BOTS.COACH, { action: ANALYTIC_EVENT_STATES.SEARCH, text }, chatId, this.mongoUserService);
  }
}
