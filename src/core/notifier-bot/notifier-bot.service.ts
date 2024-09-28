import { isProd } from '@core/config/main.config';
import { MongoUserService, UserModel } from '@core/mongo/shared';
import { INotifyOptions } from '@core/notifier-bot/interface';
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

  async notify(botName: string, options: INotifyOptions, chatId, mongoUserService: MongoUserService): Promise<void> {
    if (!isProd) {
      return;
    }
    const userDetails = await mongoUserService.getUserDetails({ chatId });
    const notyMessageText = this.getNotyMessageText(botName, userDetails, options);
    this.telegramGeneralService.sendMessage(this.bot, notifierChatId, notyMessageText);
  }

  getNotyMessageText(botName: string, userDetails: UserModel, options: INotifyOptions): string {
    const { firstName, lastName, username } = userDetails;
    const sentences = [];
    sentences.push(`bot: ${botName}`);
    sentences.push(`name: ${firstName} ${lastName} - ${username}`);
    sentences.push(`action: ${options.action}`);
    options.data && Object.keys(options.data).length && sentences.push(`data: ${JSON.stringify(options.data, null, 2)}`);
    return sentences.join('\n\n');
  }
}
