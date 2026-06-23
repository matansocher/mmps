import type { Bot, Context, InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { buildInlineKeyboard } from '@services/telegram';
import { createNudge, getNudgeByShortId, getRecentMessagesForChat, setNudgeMessageId, supersedePendingNudgesForChat, updateNudgeStatus, type SecretaryMessage } from './mongo';
import { NUDGE_DELAY_MS, NUDGE_DISMISS_CALLBACK_PREFIX, NUDGE_REPLY_CALLBACK_PREFIX, NUDGE_SNOOZE_CALLBACK_PREFIX } from './secretary.config';
import { SecretaryDraftService } from './secretary-draft.service';

const CONTEXT_MESSAGE_LIMIT = 20;
const QUOTE_MAX_LENGTH = 250;

const newShortId = () => randomUUID().replace(/-/g, '').slice(0, 10);

export class SecretaryNudgeService {
  private readonly logger = new Logger(SecretaryNudgeService.name);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly connectionIds = new Map<number, string>();

  constructor(
    private readonly draftService: SecretaryDraftService,
    private readonly bot: Bot,
  ) {}

  // Her new message: (re)start the 1-hour unanswered countdown for this chat.
  scheduleNudge(chatId: number, businessConnectionId?: string): void {
    if (businessConnectionId) this.connectionIds.set(chatId, businessConnectionId);
    this.clearTimer(chatId);
    const timer = setTimeout(() => {
      this.timers.delete(chatId);
      this.sendNudge(chatId).catch((err) => this.logger.error(`Failed to send nudge for ${chatId}: ${err}`));
    }, NUDGE_DELAY_MS);
    this.timers.set(chatId, timer);
  }

  // The owner replied: drop the countdown and retire any pending nudge.
  async onOwnerReply(chatId: number): Promise<void> {
    this.clearTimer(chatId);
    await this.retirePendingNudges(chatId);
  }

  private clearTimer(chatId: number): void {
    const existing = this.timers.get(chatId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(chatId);
    }
  }

  private async sendNudge(chatId: number): Promise<void> {
    const messages = await getRecentMessagesForChat(chatId, CONTEXT_MESSAGE_LIMIT);
    if (messages.length === 0) return;

    const unanswered = this.unansweredTail(messages);
    if (unanswered.length === 0) return; // owner already replied since her last message

    await this.retirePendingNudges(chatId);

    const quote = this.buildQuote(unanswered);
    const shortId = newShortId();
    const businessConnectionId = this.connectionIds.get(chatId);
    await createNudge({ shortId, chatId, ownerChatId: MY_USER_ID, businessConnectionId, quote });

    const text = `⏰ You haven't replied for an hour:\n\n"${quote}"`;
    const sent = await this.bot.api.sendMessage(MY_USER_ID, text, { reply_markup: this.buildNudgeKeyboard(shortId) });
    await setNudgeMessageId(shortId, sent.message_id);
  }

  private unansweredTail(messages: SecretaryMessage[]): SecretaryMessage[] {
    const tail: SecretaryMessage[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].fromOwner) break;
      tail.unshift(messages[i]);
    }
    return tail;
  }

  private buildQuote(unanswered: SecretaryMessage[]): string {
    const text = unanswered.map((m) => m.text).join(' ');
    return text.length > QUOTE_MAX_LENGTH ? `${text.slice(0, QUOTE_MAX_LENGTH).trim()}…` : text;
  }

  private buildNudgeKeyboard(shortId: string): InlineKeyboard {
    return buildInlineKeyboard(
      [
        { text: 'Reply ✍️', data: `${NUDGE_REPLY_CALLBACK_PREFIX}${shortId}`, style: 'primary' },
        { text: 'Snooze 1h 💤', data: `${NUDGE_SNOOZE_CALLBACK_PREFIX}${shortId}` },
        { text: 'Dismiss ✖️', data: `${NUDGE_DISMISS_CALLBACK_PREFIX}${shortId}`, style: 'danger' },
      ],
      3,
    );
  }

  private async retirePendingNudges(chatId: number): Promise<void> {
    const retired = await supersedePendingNudgesForChat(chatId);
    for (const nudge of retired) {
      if (!nudge.messageId) continue;
      try {
        await this.bot.api.editMessageReplyMarkup(nudge.ownerChatId, nudge.messageId);
      } catch (err) {
        this.logger.error(`Failed to remove buttons from superseded nudge ${nudge.shortId}: ${err}`);
      }
    }
  }

  async handleReply(ctx: Context): Promise<void> {
    const shortId = (ctx.callbackQuery?.data ?? '').slice(NUDGE_REPLY_CALLBACK_PREFIX.length);
    const nudge = await getNudgeByShortId(shortId);
    if (!nudge) {
      await ctx.answerCallbackQuery({ text: 'This nudge is no longer available.' });
      return;
    }

    if (nudge.status === 'pending') await updateNudgeStatus(shortId, 'replied');
    await this.removeButtons(ctx);
    await ctx.answerCallbackQuery({ text: 'Drafting a reply… ✍️' });
    await this.draftService.suggestNow(nudge.chatId, nudge.businessConnectionId);
  }

  async handleSnooze(ctx: Context): Promise<void> {
    const shortId = (ctx.callbackQuery?.data ?? '').slice(NUDGE_SNOOZE_CALLBACK_PREFIX.length);
    const nudge = await getNudgeByShortId(shortId);
    if (!nudge) {
      await ctx.answerCallbackQuery({ text: 'This nudge is no longer available.' });
      return;
    }

    if (nudge.status === 'pending') await updateNudgeStatus(shortId, 'snoozed');
    this.scheduleNudge(nudge.chatId, nudge.businessConnectionId);
    await this.removeButtons(ctx);
    await ctx.answerCallbackQuery({ text: 'Snoozed 1h 💤' });
  }

  async handleDismiss(ctx: Context): Promise<void> {
    const shortId = (ctx.callbackQuery?.data ?? '').slice(NUDGE_DISMISS_CALLBACK_PREFIX.length);
    const nudge = await getNudgeByShortId(shortId);
    if (nudge) {
      if (nudge.status === 'pending') await updateNudgeStatus(shortId, 'dismissed');
      this.clearTimer(nudge.chatId);
    }
    await this.removeButtons(ctx);
    await ctx.answerCallbackQuery({ text: 'Dismissed' });
  }

  private async removeButtons(ctx: Context): Promise<void> {
    try {
      await ctx.editMessageReplyMarkup();
    } catch (err) {
      this.logger.error(`Failed to remove nudge buttons: ${err}`);
    }
  }
}
