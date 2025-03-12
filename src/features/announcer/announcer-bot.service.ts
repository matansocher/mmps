import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getErrorMessage, sleep } from '@core/utils';
import { BOTS, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { isMessageValid } from './utils';

// const chatIds = [1180106362, 5660723464, 2120928381, 1611860664, 7404564565, 5537518885, 397364609, 5089971664, 5833146559, 461223274, 398475771, 1706487836];

// const message = [
//   `👋 היי! לאחרונה שמנו לב שחלק מהמשתמשים לא קיבלו התראות כראוי.`,
//   `הבעיה טופלה, ועכשיו הכל אמור לעבוד כרגיל. תודה על הסבלנות!`,
//   `אם תיתקלו בבעיה נוספת או שיש לכם רעיונות לשיפור – אתם מוזמנים להשתמש בפקודת "צור קשר" ולשלוח לנו פידבק. 💙`,
//   `תודה שאתם כאן! 🚀`,
// ].join('\n\n');

@Injectable()
export class AnnouncerBotService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncerBotService.name);

  constructor(
    @Inject(BOTS.ANNOUNCER.id) private readonly bot: TelegramBot,
    @Inject(BOTS.WOLT.id) private readonly woltBot: TelegramBot,
    @Inject(BOTS.VOICE_PAL.id) private readonly voicePalBot: TelegramBot,
    @Inject(BOTS.COACH.id) private readonly coachBot: TelegramBot,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly programmingTeacherBot: TelegramBot,
    @Inject(BOTS.EDUCATOR.id) private readonly educatorBot: TelegramBot,
    @Inject(BOTS.TRAINER.id) private readonly trainerBot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const handlers: TelegramEventHandler[] = [{ event: TELEGRAM_EVENTS.MESSAGE, handler: (message) => this.textHandler.call(this, message) }];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId: announcerChatId, text } = getMessageData(message);

    try {
      const details = isMessageValid(text);
      const relevantBot = this.getRelevantBot(details.botName);
      if (!details || !relevantBot) {
        await this.bot.sendMessage(announcerChatId, 'not a valid message');
        return;
      }

      for (const userChatId of details.chatIds) {
        await this.sendMessageToUser(relevantBot, userChatId, announcerChatId, details.text);
        await sleep(5000);
      }
      await this.bot.sendMessage(announcerChatId, `finished announcement to ${details.chatIds.length} users`);
    } catch (err) {
      const errMessage = getErrorMessage(err);
      await this.bot.sendMessage(announcerChatId, errMessage);
    }
  }

  getRelevantBot(botName: string): TelegramBot {
    switch (botName) {
      case BOTS.WOLT.id:
        return this.woltBot;
      case BOTS.VOICE_PAL.id:
        return this.voicePalBot;
      case BOTS.COACH.id:
        return this.coachBot;
      case BOTS.PROGRAMMING_TEACHER.id:
        return this.programmingTeacherBot;
      case BOTS.EDUCATOR.id:
        return this.educatorBot;
      case BOTS.TRAINER.id:
        return this.trainerBot;
      default:
        return null;
    }
  }

  async sendMessageToUser(bot: TelegramBot, userChatId: number, announcerChatId: number, message: string): Promise<void> {
    try {
      await bot.sendMessage(userChatId, message);
      await this.bot.sendMessage(announcerChatId, `chatId: ${userChatId} - SENT`);
    } catch (err) {
      await this.bot.sendMessage(announcerChatId, `chatId: ${userChatId} - ERROR, ${getErrorMessage(err)}`);
    }
  }
}
