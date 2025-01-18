import TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { MessageLoaderOptions } from '../interface';
import { BOT_BROADCAST_ACTIONS } from '@services/telegram';

const TURTLE_EMOJI = '🐢';
const MAX_TURTLES = 10;
const DEFAULT_CYCLE_DURATION = 3000;

interface MessageLoaderData {
  cycleIterationIndex: number;
  timeoutId: NodeJS.Timeout | number;
  loaderMessageId: number;
}

export class MessageLoaderService {
  private readonly logger = new Logger(MessageLoaderService.name);
  private messages: Record<number, MessageLoaderData> = {};

  private readonly bot: TelegramBot;
  private readonly chatId: number;
  private readonly loaderEmoji: string;
  private readonly cycleDuration: number;
  private readonly loadingAction: BOT_BROADCAST_ACTIONS;

  constructor(bot: TelegramBot, chatId: number, options: MessageLoaderOptions) {
    this.bot = bot;
    this.chatId = chatId;
    this.loaderEmoji = options.loaderEmoji || TURTLE_EMOJI;
    this.loadingAction = options.loadingAction || BOT_BROADCAST_ACTIONS.TYPING;
    this.cycleDuration = options.cycleDuration || DEFAULT_CYCLE_DURATION;
  }

  async handleMessageWithLoader(action: () => Promise<void>) {
    try {
      await this.waitForMessage();
      await action();
    } catch (err) {
      await this.stopLoader();
      throw err;
    } finally {
      await this.stopLoader();
    }
  }

  async waitForMessage() {
    try {
      this.messages[this.chatId] = { cycleIterationIndex: 0, timeoutId: null, loaderMessageId: null };
      await this.bot.sendChatAction(this.chatId, this.loadingAction);
      this.cycleInitiator();
    } catch (err) {
      this.logger.error(MessageLoaderService.name, `error - ${getErrorMessage(err)}`);
      await this.stopLoader();
    }
  }

  cycleInitiator(): void {
    this.messages[this.chatId].timeoutId = setTimeout(async () => {
      if (this.messages[this.chatId]?.cycleIterationIndex >= MAX_TURTLES) {
        return;
      }
      await this.processCycle();
    }, this.cycleDuration || DEFAULT_CYCLE_DURATION);
  }

  async processCycle(): Promise<void> {
    const turtles = this.loaderEmoji.repeat(this.messages[this.chatId]?.cycleIterationIndex + 1);
    let messageRes;
    if (this.messages[this.chatId]?.cycleIterationIndex === 0) {
      messageRes = await this.bot.sendMessage(this.chatId, turtles);
    } else {
      await this.bot.editMessageText(turtles, { chat_id: this.chatId, message_id: this.messages[this.chatId]?.loaderMessageId });
    }
    await this.bot.sendChatAction(this.chatId, this.loadingAction);

    this.messages[this.chatId].loaderMessageId = messageRes?.message_id || this.messages[this.chatId]?.loaderMessageId;
    this.messages[this.chatId].cycleIterationIndex += 1;
    this.cycleInitiator();
  }

  async stopLoader(): Promise<void> {
    if (!this.messages[this.chatId]?.loaderMessageId) {
      return;
    }
    const { timeoutId, loaderMessageId } = this.messages[this.chatId];
    clearTimeout(timeoutId as number);
    if (loaderMessageId) {
      setTimeout(() => this.bot.deleteMessage(this.chatId, loaderMessageId), 1000);
    }
    delete this.messages[this.chatId];
  }
}
