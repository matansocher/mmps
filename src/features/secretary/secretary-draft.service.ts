import type { Bot, Context, InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { buildInlineKeyboard } from '@services/telegram';
import { createDraft, getDraftByShortId, getRecentMessagesForChat, setDraftMessageId, supersedePendingDraftsForChat, updateDraftStatus } from './mongo';
import { DRAFT_CANCEL_CALLBACK_PREFIX, DRAFT_SEND_CALLBACK_PREFIX, IDLE_REPLY_DELAY_MS, OWNER_BUSINESS_CONNECTION_ID, REPLY_NEEDED_THRESHOLD } from './secretary.config';
import { generateDraftReply, unansweredTail } from './secretary-draft.utils';
import { SecretaryService } from './secretary.service';

const CONTEXT_MESSAGE_LIMIT = 20;

const newShortId = () => randomUUID().replace(/-/g, '').slice(0, 10);

export class SecretaryDraftService {
  private readonly logger = new Logger(SecretaryDraftService.name);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly connectionIds = new Map<number, string>();

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly bot: Bot,
  ) {}

  // Her new message: (re)start the idle countdown for this chat.
  scheduleSuggestion(chatId: number, businessConnectionId?: string): void {
    if (businessConnectionId) this.connectionIds.set(chatId, businessConnectionId);
    this.clearTimer(chatId);
    const timer = setTimeout(() => {
      this.timers.delete(chatId);
      this.suggestDraft(chatId).catch((err) => this.logger.error(`Failed to suggest draft for ${chatId}: ${err}`));
    }, IDLE_REPLY_DELAY_MS);
    this.timers.set(chatId, timer);
  }

  // The owner replied (manually or via the Send button): drop the countdown and retire pending suggestions.
  async onOwnerReply(chatId: number): Promise<void> {
    this.clearTimer(chatId);
    await this.retirePendingDrafts(chatId);
  }

  // Generate and send a draft suggestion immediately (used by the forgotten-reply nudge's Reply button).
  async suggestNow(chatId: number, businessConnectionId?: string): Promise<void> {
    if (businessConnectionId) this.connectionIds.set(chatId, businessConnectionId);
    this.clearTimer(chatId);
    await this.suggestDraft(chatId, { respectReplyNeeded: false });
  }

  private clearTimer(chatId: number): void {
    const existing = this.timers.get(chatId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(chatId);
    }
  }

  private async suggestDraft(chatId: number, options: { respectReplyNeeded: boolean } = { respectReplyNeeded: true }): Promise<void> {
    const messages = await getRecentMessagesForChat(chatId, CONTEXT_MESSAGE_LIMIT);
    if (messages.length === 0) return;

    if (unansweredTail(messages).length === 0) return; // owner already replied since her last message

    let generated;
    try {
      generated = await generateDraftReply(messages);
    } catch (err) {
      this.logger.error(`Failed to generate draft: ${err}`);
      return;
    }
    if (!generated) return;

    // On the automatic path, skip silently when the model judges a reply is probably unnecessary
    // (e.g. she just acknowledged). The nudge's explicit Reply button bypasses this.
    if (options.respectReplyNeeded && generated.replyNeeded < REPLY_NEEDED_THRESHOLD) {
      this.logger.log(`Skipping draft for ${chatId}: replyNeeded=${generated.replyNeeded.toFixed(2)} < ${REPLY_NEEDED_THRESHOLD}`);
      return;
    }

    // Replace any earlier still-pending suggestion for this chat with the fresh one.
    await this.retirePendingDrafts(chatId);

    const shortId = newShortId();
    const businessConnectionId = this.connectionIds.get(chatId);
    await createDraft({ shortId, chatId, ownerChatId: MY_USER_ID, businessConnectionId, draftText: generated.draft, summaryText: generated.summary });

    const text = this.formatSuggestion(generated.draft, generated.summary);
    const sent = await this.bot.api.sendMessage(MY_USER_ID, text, { reply_markup: this.buildDraftKeyboard(shortId) });
    await setDraftMessageId(shortId, sent.message_id);
  }

  private formatSuggestion(draft: string, summary: string): string {
    return summary ? `📋 She talked about: ${summary}\n\n💬 Suggested reply:\n${draft}` : `💬 Suggested reply:\n${draft}`;
  }

  private buildDraftKeyboard(shortId: string): InlineKeyboard {
    return buildInlineKeyboard(
      [
        { text: 'Send ✅', data: `${DRAFT_SEND_CALLBACK_PREFIX}${shortId}`, style: 'success' },
        { text: 'Cancel ✖️', data: `${DRAFT_CANCEL_CALLBACK_PREFIX}${shortId}`, style: 'danger' },
      ],
      2,
    );
  }

  // Mark pending drafts for a chat as superseded and strip their buttons.
  private async retirePendingDrafts(chatId: number): Promise<void> {
    const retired = await supersedePendingDraftsForChat(chatId);
    for (const draft of retired) {
      if (!draft.messageId) continue;
      try {
        await this.bot.api.editMessageReplyMarkup(draft.ownerChatId, draft.messageId);
      } catch (err) {
        this.logger.error(`Failed to remove buttons from superseded draft ${draft.shortId}: ${err}`);
      }
    }
  }

  async handleSend(ctx: Context): Promise<void> {
    const shortId = (ctx.callbackQuery?.data ?? '').slice(DRAFT_SEND_CALLBACK_PREFIX.length);
    const draft = await getDraftByShortId(shortId);
    if (!draft || draft.status !== 'pending') {
      await ctx.answerCallbackQuery({ text: 'This draft is no longer available.' });
      return;
    }

    const businessConnectionId = draft.businessConnectionId ?? OWNER_BUSINESS_CONNECTION_ID;
    if (!businessConnectionId) {
      await ctx.answerCallbackQuery({ text: 'Missing business connection id — cannot send.', show_alert: true });
      return;
    }

    try {
      await this.bot.api.sendMessage(draft.chatId, draft.draftText, { business_connection_id: businessConnectionId });
      await this.secretaryService.storeMessage({ chatId: draft.chatId, fromOwner: true, text: draft.draftText });
      await updateDraftStatus(shortId, 'sent');
      this.clearTimer(draft.chatId);
      await ctx.editMessageText(`Sent ✅\n\n${draft.draftText}`);
      await ctx.answerCallbackQuery({ text: 'Sent ✅' });
    } catch (err) {
      this.logger.error(`Failed to send draft ${shortId}: ${err}`);
      await ctx.answerCallbackQuery({ text: 'Failed to send.', show_alert: true });
    }
  }

  async handleCancel(ctx: Context): Promise<void> {
    const shortId = (ctx.callbackQuery?.data ?? '').slice(DRAFT_CANCEL_CALLBACK_PREFIX.length);
    const draft = await getDraftByShortId(shortId);
    if (draft && draft.status === 'pending') await updateDraftStatus(shortId, 'cancelled');

    try {
      await ctx.editMessageReplyMarkup();
    } catch (err) {
      this.logger.error(`Failed to remove draft buttons: ${err}`);
    }
    await ctx.answerCallbackQuery({ text: 'Dismissed' });
  }
}
