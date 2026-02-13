import type { Bot } from 'grammy';
import type { ReactionTypeEmoji } from 'grammy/types';

const SHOW_AFTER_MS = 3000;
const DELETE_AFTER_NO_RESPONSE_MS = 15000;

export type MessageLoaderOptions = {
  readonly loaderMessage?: string;
  readonly reactionEmoji?: ReactionTypeEmoji['emoji'];
  readonly loadingAction?: string;
};

export class MessageLoader {
  private readonly bot: Bot;
  private readonly chatId: number;
  private readonly messageId: number;
  private readonly loaderMessage: string;
  private readonly reactionEmoji: ReactionTypeEmoji['emoji'];
  private readonly loadingAction: string;

  private timeoutId?: ReturnType<typeof setTimeout>;
  private loaderMessageId?: number;

  constructor(bot: Bot, chatId: number, messageId: number, options: MessageLoaderOptions) {
    this.bot = bot;
    this.chatId = chatId;
    this.messageId = messageId;
    this.loaderMessage = options.loaderMessage;
    this.reactionEmoji = options.reactionEmoji;
    this.loadingAction = options.loadingAction ?? 'typing';
  }

  async handleMessageWithLoader(action: () => Promise<void>): Promise<void> {
    try {
      await this.#startLoader();
      await action();
    } catch (err) {
      await this.#stopLoader();
    } finally {
      await this.#stopLoader();
    }
  }

  async #startLoader(): Promise<void> {
    if (this.reactionEmoji) {
      await this.bot.api.setMessageReaction(this.chatId, this.messageId, [{ type: 'emoji', emoji: this.reactionEmoji }]).catch(() => {});
    }
    await this.bot.api.sendChatAction(this.chatId, this.loadingAction as any);

    this.timeoutId = setTimeout(async () => {
      if (this.loaderMessage) {
        const messageRes = await this.bot.api.sendMessage(this.chatId, this.loaderMessage);
        this.loaderMessageId = messageRes.message_id;
      }

      this.timeoutId = setTimeout(async () => {
        await this.#stopLoader();
      }, DELETE_AFTER_NO_RESPONSE_MS);
    }, SHOW_AFTER_MS);
  }

  async #stopLoader(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    if (this.loaderMessageId) {
      await this.bot.api.deleteMessage(this.chatId, this.loaderMessageId).catch(() => {});
      this.loaderMessageId = undefined;
    }
  }
}