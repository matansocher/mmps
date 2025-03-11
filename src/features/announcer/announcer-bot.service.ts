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
  ) {}

  onModuleInit(): void {
    const handlers: TelegramEventHandler[] = [{ event: TELEGRAM_EVENTS.MESSAGE, handler: (message) => this.textHandler.call(this, message) }];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    try {
      const details = isMessageValid(text);
      if (!details) {
        await this.bot.sendMessage(chatId, 'not a valid message');
        return;
      }

      for (const userChatId of details.chatIds) {
        await this.sendMessageToUser(this.woltBot, userChatId, details.text);
        await sleep(5000);
      }
      await this.bot.sendMessage(chatId, `finished announcement to ${details.chatIds.length} users`);
    } catch (err) {
      const errMessage = getErrorMessage(err);
      await this.bot.sendMessage(chatId, errMessage);
    }
  }

  async sendMessageToUser(bot: TelegramBot, chatId: number, message: string): Promise<void> {
    try {
      await bot.sendMessage(chatId, message);
      await this.bot.sendMessage(chatId, `chatId: ${chatId} - SENT`);
    } catch (err) {
      const errMessage = getErrorMessage(err);
      await bot.sendMessage(chatId, errMessage);
      await this.bot.sendMessage(chatId, `chatId: ${chatId} - ERROR, ${errMessage}`);
    }
  }
}
