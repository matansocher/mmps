import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './notifier.config';

@Injectable()
export class NotifierController implements OnModuleInit {
  private readonly logger = new Logger(NotifierController.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    const { MESSAGE } = TELEGRAM_EVENTS;
    const handlers: TelegramEventHandler[] = [{ event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) }];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, 'I am here');
  }
}
