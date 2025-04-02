import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sleep } from '@core/utils';
import { BOTS, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { isMessageValid } from './utils';

// const message = [
//   `👋 היי! לאחרונה שמנו לב שחלק מהמשתמשים לא קיבלו התראות כראוי.`,
//   `הבעיה טופלה, ועכשיו הכל אמור לעבוד כרגיל. תודה על הסבלנות!`,
//   `אם תיתקלו בבעיה נוספת או שיש לכם רעיונות לשיפור – אתם מוזמנים להשתמש בפקודת "צור קשר" ולשלוח לנו פידבק. 💙`,
//   `תודה שאתם כאן! 🚀`,
// ].join('\n\n');

@Injectable()
export class AnnouncerController implements OnModuleInit {
  private readonly logger = new Logger(AnnouncerController.name);

  constructor(
    @Inject(BOTS.ANNOUNCER.id) private readonly bot: TelegramBot,
    @Inject(BOTS.WOLT.id) private readonly woltBot: TelegramBot,
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
      await this.bot.sendMessage(announcerChatId, `${err}`);
    }
  }

  getRelevantBot(botName: string): TelegramBot {
    switch (botName) {
      case BOTS.WOLT.id:
        return this.woltBot;
      default:
        return null;
    }
  }

  async sendMessageToUser(bot: TelegramBot, userChatId: number, announcerChatId: number, message: string): Promise<void> {
    try {
      await bot.sendMessage(userChatId, message);
      await this.bot.sendMessage(announcerChatId, `chatId: ${userChatId} - SENT`);
    } catch (err) {
      await this.bot.sendMessage(announcerChatId, `chatId: ${userChatId} - ERROR, ${err}`);
    }
  }
}
