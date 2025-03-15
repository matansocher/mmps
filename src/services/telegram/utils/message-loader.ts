import type TelegramBot from 'node-telegram-bot-api';
import { BOT_BROADCAST_ACTIONS } from '../constants';
import type { MessageLoaderOptions } from '../interface';

const LOADER_EMOJI = '🐢';
const MAX_EMOJIS = 5;
const DEFAULT_CYCLE_DURATION = 5000;

interface MessageLoaderData {
  readonly cycleIterationIndex: number;
  readonly timeoutId?: NodeJS.Timeout;
  readonly loaderMessageId?: number;
}

export class MessageLoader {
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

  getMessageCache(): MessageLoaderData | null {
    return this.messages[this.chatId] || null;
  }

  setMessageCache(messageLoaderData: Partial<MessageLoaderData>): void {
    const currentMessageLoaderData = (this.getMessageCache() || {}) as MessageLoaderData;
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
      this.setMessageCache({ cycleIterationIndex: 0, timeoutId: undefined, loaderMessageId: undefined });
      await this.bot.sendChatAction(this.chatId, this.loadingAction);
      this.cycleInitiator();
    } catch {
      await this.stopLoader();
    }
  }

  cycleInitiator(): void {
    const messageCache = this.getMessageCache();
    if (!messageCache) {
      return;
    }

    const { cycleIterationIndex, timeoutId } = messageCache;
    timeoutId && clearTimeout(timeoutId);

    if (cycleIterationIndex >= MAX_EMOJIS) {
      this.stopLoader();
      return;
    }

    const newTimeoutId = setTimeout(async () => {
      try {
        await this.processCycle();
      } catch {
        await this.stopLoader();
      }
    }, this.cycleDuration);
    this.setMessageCache({ timeoutId: newTimeoutId });
  }

  async processCycle(): Promise<void> {
    const messageCache = this.getMessageCache();
    if (!messageCache) {
      return;
    }

    const { cycleIterationIndex = 0, loaderMessageId } = messageCache;
    const loaderEmojis = this.loaderEmoji.repeat(cycleIterationIndex + 1);

    let messageRes;
    try {
      if (cycleIterationIndex === 0) {
        messageRes = await this.bot.sendMessage(this.chatId, loaderEmojis);
        this.setMessageCache({ loaderMessageId: messageRes.message_id });
      } else if (loaderMessageId) {
        await this.bot.editMessageText(loaderEmojis, { chat_id: this.chatId, message_id: loaderMessageId });
      }
      await this.bot.sendChatAction(this.chatId, this.loadingAction);

      this.setMessageCache({
        loaderMessageId: messageRes?.message_id || loaderMessageId,
        cycleIterationIndex: cycleIterationIndex + 1,
      });
      this.cycleInitiator();
    } catch {
      await this.stopLoader();
    }
  }

  async stopLoader(): Promise<void> {
    const messageCache = this.getMessageCache();
    if (!messageCache) {
      return;
    }
    const { timeoutId, loaderMessageId } = messageCache;
    timeoutId && clearTimeout(timeoutId);
    loaderMessageId && (await this.bot.deleteMessage(this.chatId, loaderMessageId));
    this.deleteMessageCache();
  }
}
