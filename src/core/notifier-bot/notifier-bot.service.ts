import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MongoUserService, UserModel } from '@core/mongo/shared';
import { BOTS, TelegramGeneralService, getMessageData } from '@services/telegram';
import { INotifyOptions } from './interface';
import { MessageType, NOTIFIER_CHAT_ID } from './notifier-bot.config';
import { getErrorMessage } from '@core/utils';

@Injectable()
export class NotifierBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
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
    const { chatId } = getMessageData(message);
    try {
      await this.bot.sendMessage(chatId, 'I am here');
    } catch (err) {
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async notify(botName: string, options: INotifyOptions, chatId: number, mongoUserService: MongoUserService): Promise<void> {
    const userDetails = chatId && mongoUserService ? await mongoUserService.getUserDetails({ chatId }) : null;
    const notyMessageText = this.getNotyMessageText(botName, userDetails, options);
    this.bot.sendMessage(NOTIFIER_CHAT_ID, notyMessageText);
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

  async collect(messageType: MessageType, data: string): Promise<void> {
    try {
      switch (messageType) {
        case MessageType.TEXT:
          await this.bot.sendMessage(NOTIFIER_CHAT_ID, data);
          break;
        case MessageType.PHOTO:
          await this.bot.sendPhoto(NOTIFIER_CHAT_ID, data);
          break;
        case MessageType.AUDIO:
          await this.bot.sendVoice(NOTIFIER_CHAT_ID, data);
          break;
        case MessageType.VIDEO:
          await this.bot.sendVideo(NOTIFIER_CHAT_ID, data);
          break;
      }
    } catch (err) {
      this.logger.error(this.collect.name, `err: ${getErrorMessage(err)}`);
    }
  }
}
