import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sleep } from '@core/utils';
import { getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './announcer.config';
import { isMessageValid } from './utils';

@Injectable()
export class AnnouncerController implements OnModuleInit {
  private readonly logger = new Logger(AnnouncerController.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

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
