import TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { MessageLoaderOptions } from '../interface';
import { BOT_BROADCAST_ACTIONS } from '@services/telegram';

const LOADER_EMOJI = '🐢';
const MAX_TURTLES = 10;
const DEFAULT_CYCLE_DURATION = 3000;

interface MessageLoaderData {
  cycleIterationIndex: number;
  timeoutId: NodeJS.Timeout;
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
    this.loaderEmoji = options.loaderEmoji || LOADER_EMOJI;
    this.loadingAction = options.loadingAction || BOT_BROADCAST_ACTIONS.TYPING;
    this.cycleDuration = options.cycleDuration || DEFAULT_CYCLE_DURATION;
  }

  getMessageCache(): MessageLoaderData {
    return this.messages[this.chatId] || null;
  }

  setMessageCache(messageLoaderData: Partial<MessageLoaderData>): void {
    const currentMessageLoaderData = this.getMessageCache();
    this.messages[this.chatId] = { ...currentMessageLoaderData, ...messageLoaderData };
  }

  deleteMessageCache(): void {
    delete this.messages[this.chatId];
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
      this.setMessageCache({ cycleIterationIndex: 0, timeoutId: null, loaderMessageId: null });
      await this.bot.sendChatAction(this.chatId, this.loadingAction);
      this.cycleInitiator();
    } catch (err) {
      this.logger.error(`${this.waitForMessage.name} - error - ${getErrorMessage(err)}`);
      await this.stopLoader();
    }
  }

  cycleInitiator(): void {
    const timeoutId = setTimeout(async () => {
      const { cycleIterationIndex } = this.getMessageCache();
      if (cycleIterationIndex >= MAX_TURTLES) {
        return this.stopLoader();
      }
      await this.processCycle();
    }, this.cycleDuration || DEFAULT_CYCLE_DURATION);
    this.setMessageCache({ timeoutId });
  }

  async processCycle(): Promise<void> {
    const { cycleIterationIndex = 0, loaderMessageId } = this.getMessageCache();
    const turtles = this.loaderEmoji.repeat(cycleIterationIndex + 1);
    let messageRes;
    if (cycleIterationIndex === 0) {
      messageRes = await this.bot.sendMessage(this.chatId, turtles);
    } else {
      await this.bot.editMessageText(turtles, { chat_id: this.chatId, message_id: loaderMessageId });
    }
    await this.bot.sendChatAction(this.chatId, this.loadingAction);

    this.setMessageCache({ loaderMessageId: messageRes?.message_id || loaderMessageId, cycleIterationIndex: cycleIterationIndex + 1 });
    this.cycleInitiator();
  }

  async stopLoader(): Promise<void> {
    const messageCache = this.getMessageCache();
    if (!messageCache) {
      return;
    }
    const { timeoutId, loaderMessageId } = messageCache;
    clearTimeout(timeoutId);
    loaderMessageId && (await this.bot.deleteMessage(this.chatId, loaderMessageId));
    this.deleteMessageCache();
  }
}
