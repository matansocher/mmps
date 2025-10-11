import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { TelegramBotConfig, UserDetails } from '@services/telegram';
import { BOT_CONFIG, MessageType, NOTIFIER_CHAT_ID } from './notifier.config';

type NotifyOptions = {
  readonly [key: string]: any;
  readonly action: string;
  readonly plainText?: string;
};

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  notify(bot: TelegramBotConfig, options: NotifyOptions, userDetails?: UserDetails): void {
    if (userDetails?.chatId === MY_USER_ID) {
      return;
    }
    const notyMessageText = this.getNotyMessageText(bot.name, options, userDetails);
    this.bot.sendMessage(NOTIFIER_CHAT_ID, notyMessageText);
  }

  getNotyMessageText(botName: string, options: NotifyOptions, userDetails: UserDetails): string {
    const { firstName = '', lastName = '', username = '' } = userDetails || {};
    const { action, plainText, ...otherOptions } = options;
    const sentences = [];
    sentences.push(`bot: ${botName}`);
    userDetails && sentences.push(`name: ${firstName} ${lastName} - ${username}`);
    sentences.push(`action: ${action.replaceAll('_', ' ')}`);
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
      this.logger.error(`${this.collect.name} - err: ${err}`);
    }
  }
}
