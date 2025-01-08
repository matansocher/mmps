import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MongoUserService, UserModel } from '@core/mongo/shared';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { INotifyOptions } from './interface';
import { NOTIFIER_CHAT_ID } from './notifier-bot.config';

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

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NOTIFIER.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NOTIFIER.name, 'error', error));
  }

  createBotEventListeners(): void {
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

  async notify(botName: string, options: INotifyOptions, chatId: number, mongoUserService: MongoUserService): Promise<void> {
    return; // $$$$$$$$$$$$$
    const userDetails = chatId && mongoUserService ? await mongoUserService.getUserDetails({ chatId }) : null;
    const notyMessageText = this.getNotyMessageText(botName, userDetails, options);
    this.telegramGeneralService.sendMessage(this.bot, NOTIFIER_CHAT_ID, notyMessageText);
  }

  getNotyMessageText(botName: string, userDetails: UserModel, options: INotifyOptions): string {
    const { firstName = '', lastName = '', username = '' } = userDetails || {};
    const { action, plainText, ...otherOptions } = options;
    const sentences = [];
    sentences.push(`bot: ${botName}`);
    userDetails && sentences.push(`name: ${firstName} ${lastName} - ${username}`);
    sentences.push(`action: ${action.toLowerCase().replaceAll('_', ' ')}`);
    otherOptions && Object.keys(otherOptions).length && sentences.push(`data: ${JSON.stringify(otherOptions, null, 2)}`);
    plainText && sentences.push(plainText);
    return sentences.join('\n');
  }
}
