import { notifyOptions } from '@core/notifier-bot/interface';
import { notifierChatId } from '@core/notifier-bot/notifier-bot.config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class NotifierBotService implements OnModuleInit {
  constructor(
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.NOTIFIER.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NOTIFIER.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NOTIFIER.name, 'error', error));
  }

  createBotEventListeners() {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = this.telegramGeneralService.getMessageData(message);
    try {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, 'I am here');
    } catch (err) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }

  notify(options: notifyOptions): void {
    const notyMessageText = this.getNotyMessageText(options);
    this.telegramGeneralService.sendMessage(this.bot, notifierChatId, notyMessageText);
  }

  getNotyMessageText(options: notifyOptions): string {
    // const { message, error, data } = options;
    // const messageText = message ? `Message: ${message}` : '';
    // const errorText = error ? `Error: ${error}` : '';
    // const dataText = data ? `Data: ${JSON.stringify(data)}` : '';
    return ``;
  }
}
