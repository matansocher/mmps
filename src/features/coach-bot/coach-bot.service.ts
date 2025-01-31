import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, getMessageData, MessageLoader, MessageLoaderOptions, sendStyledMessage, TELEGRAM_EVENTS, TelegramBotHandler } from '@services/telegram';
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
    const handlers: TelegramBotHandler[] = [
      { regex: COACH_BOT_OPTIONS.START, handler: this.startHandler },
      { regex: COACH_BOT_OPTIONS.SUBSCRIBE, handler: this.subscribeHandler },
      { regex: COACH_BOT_OPTIONS.UNSUBSCRIBE, handler: this.unsubscribeHandler },
    ];
    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), (message: Message) => handler.call(this, message));
    });

    this.bot.on(TELEGRAM_EVENTS.TEXT, (message: Message) => this.textHandler(message));
  }

  private async handleCommand(message: Message, handler: (chatId: number) => Promise<void>) {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${handler.name} - ${logBody} - start`);
      await handler(chatId);
      this.logger.log(`${handler.name} - success`);
    } catch (err) {
      const errorMessage = `error: ${getErrorMessage(err)}`;
      this.logger.error(`${handler.name} - chatId:${chatId} - ${errorMessage}`);
      await this.bot.sendMessage(chatId, GENERAL_ERROR_RESPONSE);
      this.notifierBotService.notify(
        BOTS.COACH,
        {
          action: `${handler.name} - ${ANALYTIC_EVENT_STATES.ERROR}`,
          error: errorMessage,
        },
        chatId,
        this.mongoUserService,
      );
    }
  }

  private async startHandler(message: Message) {
    await this.handleCommand(message, async (chatId) => {
      const { telegramUserId, firstName, lastName, username } = getMessageData(message);
      await this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
    });
  }

  private async subscribeHandler(message: Message) {
    await this.handleCommand(message, async (chatId) => {
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `וואלה אני רואה שכבר שמת עוקב, אז הכל טוב ✅`);
        return;
      }
      await this.mongoSubscriptionService.addSubscription(chatId);
      await this.bot.sendMessage(chatId, `סבבה, אני אשלח לך עדכונים יומיים ✅. אפשר להסיר עוקב תמיד פה למטה (unsubscribe)`);
    });
  }

  private async unsubscribeHandler(message: Message) {
    await this.handleCommand(message, async (chatId) => {
      const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
      if (subscription) {
        await this.bot.sendMessage(chatId, `טוב אני רואה שעדיין לא שמת עוקב, לא סבבה 😁`);
        return;
      }
      await this.mongoSubscriptionService.archiveSubscription(chatId);
      await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
    });
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(COACH_BOT_OPTIONS).some((option: string) => text.includes(COACH_BOT_OPTIONS[option]))) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(`${this.textHandler.name} - ${logBody} - start`);

    try {
      const messageLoaderService = new MessageLoader(this.bot, chatId, {
        cycleDuration: 3000,
        loaderEmoji: '🤔',
      } as MessageLoaderOptions);
      await messageLoaderService.handleMessageWithLoader(async () => {
        const replyText = await this.coachService.getMatchesSummaryMessage(text);
        await sendStyledMessage(this.bot, chatId, replyText);
      });

      this.logger.log(`${this.textHandler.name} - success`);
    } catch (err) {
      const errorMessage = `error: ${getErrorMessage(err)}`;
      this.logger.error(`${this.textHandler.name} - chatId:${chatId} - ${errorMessage}`);
      await this.bot.sendMessage(chatId, GENERAL_ERROR_RESPONSE);
    }
  }
}
