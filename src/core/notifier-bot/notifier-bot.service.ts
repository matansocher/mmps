import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { isProd } from '@core/config/main.config';
import { MongoUserService, UserModel } from '@core/mongo/shared';
import { INotifyOptions } from '@core/notifier-bot/interface';
import { NOTIFIER_CHAT_ID } from '@core/notifier-bot/notifier-bot.config';
import { BOTS, TelegramGeneralService } from '@services/telegram';

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

    let userDetails = null;
    if (chatId && mongoUserService) {
      userDetails = await mongoUserService.getUserDetails({ chatId });
    }
    const notyMessageText = this.getNotyMessageText(botName, userDetails, options);
    this.telegramGeneralService.sendMessage(this.bot, NOTIFIER_CHAT_ID, notyMessageText);
  }

  getNotyMessageText(botName: string, userDetails: UserModel, options: INotifyOptions): string {
    const { firstName = '', lastName = '', username = '' } = userDetails;
    const { action, ...otherOptions } = options;
    const sentences = [];
    sentences.push(`bot: ${botName}`);
    userDetails && sentences.push(`name: ${firstName} ${lastName} - ${username}`);
    sentences.push(`action: ${action}`);
    otherOptions && Object.keys(otherOptions).length && sentences.push(`data: ${JSON.stringify(otherOptions, null, 2)}`);
    return sentences.join('\n\n');
  }
}
