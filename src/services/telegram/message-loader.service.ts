import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { MessageLoaderOptions } from '@services/telegram';
import { TelegramGeneralService } from '@services/telegram';
import { UtilsService } from '@services/utils';

const LOADER_MESSAGES = [
  'Just a moment...',
  'Hold on, working on it...',
  'Still on it...',
  'Just a little bit longer...',
  'Hang tight, almost there...',
  'Any second now...',
  'Thanks for your patience...',
  'This is my last loading message, if there is no response, show it to Matan 😁',
];

const DEFAULT_CYCLE_DURATION = 5000;

interface MessageLoaderData {
  cycleIterationIndex: number;
  timeoutId: NodeJS.Timeout | number;
  loaderMessageId: number;
}

@Injectable()
export class MessageLoaderService {
  private messages: Record<number, MessageLoaderData> = {};

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
  ) {}

  async handleMessageWithLoader(bot: TelegramBot, chatId: number, options: MessageLoaderOptions, action: () => Promise<void>) {
    try {
      await this.waitForMessage(bot, chatId, options);
      await action();
    } catch (err) {
      this.logger.error(MessageLoaderService.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.stopLoader(bot, chatId);
      throw err;
    } finally {
      await this.stopLoader(bot, chatId);
    }
  }

  async waitForMessage(bot: TelegramBot, chatId: number, options: MessageLoaderOptions) {
    try {
      this.messages[chatId] = { cycleIterationIndex: 0, timeoutId: null, loaderMessageId: null };
      await this.telegramGeneralService.sendChatAction(bot, chatId, options.loadingAction);
      this.cycleInitiator(bot, chatId, options);
    } catch (err) {
      this.logger.error(MessageLoaderService.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.stopLoader(bot, chatId);
    }
  }

  cycleInitiator(bot: TelegramBot, chatId: number, options: MessageLoaderOptions): void {
    this.messages[chatId].timeoutId = setTimeout(async () => {
      if (this.messages[chatId]?.cycleIterationIndex > LOADER_MESSAGES.length) {
        return;
      }
      await this.processCycle(bot, chatId, options);
    }, options.cycleDuration || DEFAULT_CYCLE_DURATION);
  }

  async processCycle(bot: TelegramBot, chatId: number, options: MessageLoaderOptions): Promise<void> {
    let messagePromise;

    const messageText = this.messages[chatId]?.cycleIterationIndex < LOADER_MESSAGES.length ? LOADER_MESSAGES[this.messages[chatId]?.cycleIterationIndex] : LOADER_MESSAGES[LOADER_MESSAGES.length - 1];
    if (this.messages[chatId]?.cycleIterationIndex === 0) {
      messagePromise = this.telegramGeneralService.sendMessage(bot, chatId, messageText);
    } else if (this.messages[chatId]?.cycleIterationIndex < LOADER_MESSAGES.length) {
      messagePromise = this.telegramGeneralService.editMessageText(bot, chatId, this.messages[chatId]?.loaderMessageId, messageText);
    }
    this.telegramGeneralService.sendChatAction(bot, chatId, options.loadingAction);

    const messageRes = await messagePromise;
    this.messages[chatId].loaderMessageId = (messageRes && messageRes.message_id) ? messageRes.message_id : this.messages[chatId]?.loaderMessageId;
    this.messages[chatId].cycleIterationIndex = this.messages[chatId].cycleIterationIndex + 1;
    this.cycleInitiator(bot, chatId, options);
  }

  async stopLoader(bot: TelegramBot, chatId: number): Promise<void> {
    const { timeoutId, loaderMessageId } = this.messages[chatId];
    clearTimeout(timeoutId as number);
    if (loaderMessageId) {
      await this.telegramGeneralService.deleteMessage(bot, chatId, loaderMessageId);
    }
    delete this.messages[chatId];
  }
}
