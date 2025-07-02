import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QuizzyMongoGameLogService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { WoltMongoSubscriptionService, WoltMongoUserService } from '@core/mongo/wolt-mongo';
import { GameLog, WorldlyMongoGameLogService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './notifier.config';

@Injectable()
export class NotifierController implements OnModuleInit {
  private readonly logger = new Logger(NotifierController.name);

  constructor(
    private readonly quizzyGameLogDB: QuizzyMongoGameLogService,
    private readonly quizzyUserDB: QuizzyMongoUserService,
    private readonly woltSubscriptionDB: WoltMongoSubscriptionService,
    private readonly woltUserDB: WoltMongoUserService,
    private readonly worldlyGameLogDB: WorldlyMongoGameLogService,
    private readonly worldlyUserDB: WorldlyMongoUserService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE } = TELEGRAM_EVENTS;
    const { QUIZZY, WOLT, WORLDLY } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: QUIZZY.command, handler: (message) => this.quizzySummaryHandler.call(this, message) },
      { event: COMMAND, regex: WOLT.command, handler: (message) => this.woltSummaryHandler.call(this, message) },
      { event: COMMAND, regex: WORLDLY.command, handler: (message) => this.worldlySummaryHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    await this.bot.sendMessage(chatId, 'I am here');
  }

  async quizzySummaryHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const topChatIds = await this.quizzyGameLogDB.getTopByChatId(10);

    const topUsers = await Promise.all(
      topChatIds.map(async ({ chatId, records }) => {
        const user = await this.quizzyUserDB.getUserDetails({ chatId });
        const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''} ${user.username ?? ''}`.replace('  ', ' ').replace('  ', ' ') : 'Unknown User';
        const correctCount = records.filter((record: GameLog) => record.selected === record.correct).length;
        return { chatId, correctCount, records, user: userName };
      }),
    );

    const replyText = `
Top users this week:
${topUsers.map(({ user, correctCount, records }, index) => `${index + 1}. ${user}: ${correctCount}/${records.length} - ${((correctCount / records.length) * 100).toFixed(2)}%`).join('\n')}
    `;
    await this.bot.sendMessage(chatId, replyText);
  }

  async woltSummaryHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const topChatIds = await this.woltSubscriptionDB.getTopBy('chatId');

    const topUsers = await Promise.all(
      topChatIds.map(async ({ _id, count }) => {
        const user = await this.woltUserDB.getUserDetails({ chatId: _id });
        const userName = user ? `${user.firstName} ${user.lastName} - ${user.username}` : 'Unknown User';
        return { _id, count, user: userName };
      }),
    );

    const topRestaurants = await this.woltSubscriptionDB.getTopBy('restaurant');

    const replyText = `
Top users this week:\n${topUsers.map(({ user, count }, index) => `${index + 1}. ${user} (${count})`).join('\n')}

Top restaurants this week:\n${topRestaurants.map(({ _id, count }, index) => `${index + 1}. ${_id} (${count})`).join('\n')}
    `;
    await this.bot.sendMessage(chatId, replyText);
  }

  async worldlySummaryHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const topChatIds = await this.worldlyGameLogDB.getTopByChatId(10);

    const topUsers = await Promise.all(
      topChatIds.map(async ({ chatId, records }) => {
        const user = await this.worldlyUserDB.getUserDetails({ chatId });
        const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''} ${user.username ?? ''}`.replace('  ', ' ').replace('  ', ' ') : 'Unknown User';
        const correctCount = records.filter((record: GameLog) => record.selected === record.correct).length;
        return { chatId, correctCount, records, user: userName };
      }),
    );

    const replyText = `
Top users this week:
${topUsers.map(({ user, correctCount, records }, index) => `${index + 1}. ${user}: ${correctCount}/${records.length} - ${((correctCount / records.length) * 100).toFixed(2)}%`).join('\n')}
    `;
    await this.bot.sendMessage(chatId, replyText);
  }
}
