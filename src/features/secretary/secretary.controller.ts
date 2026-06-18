import type { Bot, Context } from 'grammy';
import { isProd, MY_USER_ID } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getMessageData, type UserDetails } from '@services/telegram';
import { AUTO_REPLY_DELAY_MINUTES, AUTO_REPLY_DELAY_MS, BOT_CONFIG } from './secretary.config';
import { SecretaryService } from './secretary.service';

type ChatState = {
  timer?: ReturnType<typeof setTimeout>;
  engaged: boolean;
  businessConnectionId?: string;
  userDetails?: UserDetails;
};

export class SecretaryController {
  private readonly logger = new Logger(SecretaryController.name);
  private readonly chats = new Map<number, ChatState>();
  private enabled = true;

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.command('enable', (ctx) => this.enableHandler(ctx));
    this.bot.command('disable', (ctx) => this.disableHandler(ctx));
    this.bot.command('status', (ctx) => this.statusHandler(ctx));
    this.bot.on('business_connection', (ctx) => this.businessConnectionHandler(ctx));
    this.bot.on('business_message', (ctx) => this.businessMessageHandler(ctx));

    // Local-only: simulate an incoming "customer" message by DMing the bot directly,
    // so the full waiting -> auto-reply flow can be tested without a real Business connection.
    if (!isProd) {
      this.bot.command('reset', (ctx) => this.resetHandler(ctx));
      this.bot.on('message:text', (ctx) => this.simulateHandler(ctx));
      this.logger.log('Local simulation enabled: DM the bot to simulate incoming messages, /reset to clear a conversation.');
    }
  }

  private isOwner(ctx: Context): boolean {
    return ctx.from?.id === MY_USER_ID;
  }

  private async startHandler(ctx: Context): Promise<void> {
    if (!this.isOwner(ctx)) return;
    await ctx.reply(`I auto-reply to your private messages if you don't answer within ${AUTO_REPLY_DELAY_MINUTES} minutes. Use /disable to turn me off, /enable to turn me back on, /status to check.`);
  }

  private async enableHandler(ctx: Context): Promise<void> {
    if (!this.isOwner(ctx)) return;
    this.enabled = true;
    await ctx.reply('Secretary is ON 🟢');
  }

  private async disableHandler(ctx: Context): Promise<void> {
    if (!this.isOwner(ctx)) return;
    this.enabled = false;
    this.clearAll();
    await ctx.reply('Secretary is OFF 🔴');
  }

  private async statusHandler(ctx: Context): Promise<void> {
    if (!this.isOwner(ctx)) return;
    const active = [...this.chats.values()].filter((s) => s.engaged).length;
    const waiting = [...this.chats.values()].filter((s) => s.timer).length;
    await ctx.reply(this.enabled ? `Secretary is ON 🟢\nActive conversations: ${active}\nWaiting: ${waiting}` : 'Secretary is OFF 🔴');
  }

  private async resetHandler(ctx: Context): Promise<void> {
    if (!this.isOwner(ctx)) return;
    this.resetChat(ctx.chat?.id ?? 0);
    await ctx.reply('Conversation reset 🔄 — next message will start a fresh waiting window.');
  }

  private async simulateHandler(ctx: Context): Promise<void> {
    const { chatId, text } = getMessageData(ctx);
    if (!text || text.startsWith('/')) return;

    // Local testing convention: prefix with "me:" to simulate the owner replying themselves.
    if (text.startsWith('me:')) {
      const ownerText = text.slice(3).trim();
      if (ownerText) await this.secretaryService.recordOwnerReply(ownerText, chatId);
      this.resetChat(chatId);
      await ctx.reply('📝 recorded as your reply — conversation reset.');
      return;
    }

    if (!this.enabled) return;

    const userDetails: UserDetails = {
      chatId,
      telegramUserId: ctx.from?.id ?? null,
      firstName: ctx.from?.first_name ?? 'Test Sender',
      lastName: ctx.from?.last_name ?? null,
      username: ctx.from?.username ?? null,
    };

    await this.enqueueIncoming(chatId, text, undefined, userDetails);
  }

  private async businessConnectionHandler(ctx: Context): Promise<void> {
    const connection = ctx.businessConnection;
    if (!connection) return;
    this.logger.log(`Business connection update: id ${connection.id}, enabled ${connection.is_enabled}`);
  }

  private async businessMessageHandler(ctx: Context): Promise<void> {
    const message = ctx.businessMessage;
    if (!message) return;

    const chatId = message.chat.id;

    // The account owner replied themselves — record it for context and reset this chat.
    if (ctx.from?.id === MY_USER_ID) {
      if (message.text) await this.secretaryService.recordOwnerReply(message.text, chatId);
      this.resetChat(chatId);
      return;
    }

    if (!this.enabled) return;

    const text = message.text;
    if (!text) return;

    const userDetails: UserDetails = {
      chatId,
      telegramUserId: ctx.from?.id ?? null,
      firstName: ctx.from?.first_name ?? null,
      lastName: ctx.from?.last_name ?? null,
      username: ctx.from?.username ?? null,
    };

    await this.enqueueIncoming(chatId, text, message.business_connection_id, userDetails);
  }

  private async enqueueIncoming(chatId: number, text: string, businessConnectionId: string | undefined, userDetails: UserDetails): Promise<void> {
    // Always record the incoming message so the agent keeps the full conversation context.
    await this.secretaryService.recordIncoming(text, chatId);

    const state = this.chats.get(chatId);

    // Already in an active conversation — reply immediately, no waiting.
    if (state?.engaged) {
      await this.autoReply(chatId, businessConnectionId, userDetails, true);
      return;
    }

    // Still waiting — (re)start the debounced timer from the latest message.
    if (state?.timer) clearTimeout(state.timer);
    const timer = setTimeout(() => this.fireWaiting(chatId), AUTO_REPLY_DELAY_MS);
    this.chats.set(chatId, { engaged: false, businessConnectionId, userDetails, timer });
  }

  private async fireWaiting(chatId: number): Promise<void> {
    const state = this.chats.get(chatId);
    if (!state) return;
    await this.autoReply(chatId, state.businessConnectionId, state.userDetails, false);
  }

  private async autoReply(chatId: number, businessConnectionId: string | undefined, userDetails: UserDetails | undefined, immediate: boolean): Promise<void> {
    const state = this.chats.get(chatId);
    if (state?.timer) clearTimeout(state.timer);
    this.chats.set(chatId, { engaged: true, businessConnectionId, userDetails });

    if (!immediate) {
      notify(BOT_CONFIG, { action: 'AUTO_REPLY_TRIGGERED' }, userDetails);
    }

    const replyText = await this.secretaryService.generateReply(chatId);
    if (!replyText) return;

    await this.bot.api.sendMessage(chatId, replyText, businessConnectionId ? { business_connection_id: businessConnectionId } : undefined);
    notify(BOT_CONFIG, { action: 'AUTO_REPLY_SENT', message: replyText }, userDetails);
  }

  private resetChat(chatId: number): void {
    const state = this.chats.get(chatId);
    if (state?.timer) clearTimeout(state.timer);
    this.chats.delete(chatId);
  }

  private clearAll(): void {
    for (const state of this.chats.values()) {
      if (state.timer) clearTimeout(state.timer);
    }
    this.chats.clear();
  }
}
