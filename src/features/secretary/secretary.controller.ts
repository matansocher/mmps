import type { Bot, Context } from 'grammy';
import { isProd, LOCAL_FILES_PATH, MY_USER_ID, TOODIE_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile } from '@services/telegram';
import { getActionByShortId, getActionsByMessageId, updateActionStatus } from './mongo';
import { buildActionsKeyboard, SecretaryActionService } from './secretary-action.service';
import { SecretaryDraftService } from './secretary-draft.service';
import { SecretaryNudgeService } from './secretary-nudge.service';
import { SecretarySchedulerService } from './secretary-scheduler.service';
import {
  ACTION_CALLBACK_PREFIX,
  CHECK_IN_MESSAGE,
  CHECK_IN_SEND_CALLBACK,
  DRAFT_CANCEL_CALLBACK_PREFIX,
  DRAFT_SEND_CALLBACK_PREFIX,
  NUDGE_DISMISS_CALLBACK_PREFIX,
  NUDGE_REPLY_CALLBACK_PREFIX,
  NUDGE_SNOOZE_CALLBACK_PREFIX,
  OWNER_BUSINESS_CONNECTION_ID,
  TRANSCRIPTION_HEADER,
} from './secretary.config';
import { SecretaryService } from './secretary.service';

const isOwner = (ctx: Context): boolean => ctx.from?.id === MY_USER_ID;

export class SecretaryController {
  private readonly logger = new Logger(SecretaryController.name);

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly scheduler: SecretarySchedulerService,
    private readonly actionService: SecretaryActionService,
    private readonly draftService: SecretaryDraftService,
    private readonly nudgeService: SecretaryNudgeService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('summary', (ctx) => this.summaryHandler(ctx));
    this.bot.on('business_connection', (ctx) => this.businessConnectionHandler(ctx));
    this.bot.on('business_message', (ctx) => this.businessMessageHandler(ctx));
    this.bot.callbackQuery(CHECK_IN_SEND_CALLBACK, (ctx) => this.checkInSendHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${ACTION_CALLBACK_PREFIX}`), (ctx) => this.actionHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${DRAFT_SEND_CALLBACK_PREFIX}`), (ctx) => this.draftSendHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${DRAFT_CANCEL_CALLBACK_PREFIX}`), (ctx) => this.draftCancelHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${NUDGE_REPLY_CALLBACK_PREFIX}`), (ctx) => this.nudgeReplyHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${NUDGE_SNOOZE_CALLBACK_PREFIX}`), (ctx) => this.nudgeSnoozeHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${NUDGE_DISMISS_CALLBACK_PREFIX}`), (ctx) => this.nudgeDismissHandler(ctx));
    this.bot.on(['message:voice', 'message:audio'], (ctx) => this.transcribeDmHandler(ctx));
  }

  private businessConnectionHandler(ctx: Context): void {
    const connection = ctx.businessConnection;
    if (!connection) return;
    this.logger.log(`Business connection: id=${connection.id} enabled=${connection.is_enabled} userChatId=${connection.user_chat_id}`);
  }

  private async checkInSendHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }

    if (!OWNER_BUSINESS_CONNECTION_ID) {
      await ctx.answerCallbackQuery({ text: 'Missing business connection id or target user id.', show_alert: true });
      return;
    }

    try {
      await this.bot.api.sendMessage(TOODIE_USER_ID, CHECK_IN_MESSAGE, { business_connection_id: OWNER_BUSINESS_CONNECTION_ID });
      await ctx.editMessageText(`Sent ✅\n\n"${CHECK_IN_MESSAGE}"`);
      await ctx.answerCallbackQuery({ text: 'Sent ✅' });
    } catch (err) {
      this.logger.error(`Failed to send check-in message: ${err}`);
      await ctx.answerCallbackQuery({ text: 'Failed to send.', show_alert: true });
    }
  }

  private async summaryHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) return;
    await ctx.reply("Building today's summaries… 🗒️");
    await this.scheduler.runDailyDigest();
  }

  // One-tap execution of a suggested calendar/reminder action via the AI agent.
  private async actionHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }

    const data = ctx.callbackQuery?.data ?? '';
    const shortId = data.slice(ACTION_CALLBACK_PREFIX.length);
    const action = await getActionByShortId(shortId);

    if (!action) {
      await ctx.answerCallbackQuery({ text: 'Action not found.', show_alert: true });
      return;
    }
    if (action.status === 'done') {
      await ctx.answerCallbackQuery({ text: 'Already done ✅' });
      return;
    }

    // Acknowledge immediately so the button stops spinning while the agent works.
    await ctx.answerCallbackQuery({ text: 'Working… ⏳' });

    const { ok, text } = await this.actionService.execute(action.instruction);
    await updateActionStatus(shortId, ok ? 'done' : 'failed', text);

    if (action.messageId) {
      try {
        const refreshed = await getActionsByMessageId(action.messageId);
        await ctx.editMessageReplyMarkup({ reply_markup: buildActionsKeyboard(refreshed) });
      } catch (err) {
        this.logger.error(`Failed to refresh action keyboard: ${err}`);
      }
    }

    await ctx.reply(`${ok ? '✅' : '❌'} ${text}`);
  }

  private async businessMessageHandler(ctx: Context): Promise<void> {
    const message = ctx.businessMessage;
    if (!message) return;

    const chatId = message.chat.id;
    const fromOwner = ctx.from?.id === MY_USER_ID;
    const senderName = ctx.from?.first_name ?? undefined;
    const senderUsername = ctx.from?.username ?? undefined;
    const businessConnectionId = message.business_connection_id;

    const voiceFileId = message.voice?.file_id ?? message.audio?.file_id;

    // Transcribe voice notes from either side, echo the transcription into the chat as the owner.
    if (voiceFileId) {
      const transcript = await this.transcribe(voiceFileId);
      if (transcript) {
        await this.bot.api.sendMessage(chatId, `${TRANSCRIPTION_HEADER}\n${transcript}`, businessConnectionId ? { business_connection_id: businessConnectionId } : undefined);
        await this.secretaryService.storeMessage({ chatId, fromOwner, text: transcript, transcribed: true, senderName, senderUsername });
        await this.updateDraftFlow(chatId, fromOwner, businessConnectionId);
      }
      return;
    }

    const text = message.text ?? message.caption;
    if (!text) return;

    await this.secretaryService.storeMessage({ chatId, fromOwner, text, senderName, senderUsername });
    await this.updateDraftFlow(chatId, fromOwner, businessConnectionId);
  }

  // Drive the smart-reply idle timer for the wife's chat: schedule on her message, cancel on yours.
  // Drive the smart-reply idle timer and the forgotten-reply nudge for the wife's chat.
  private async updateDraftFlow(chatId: number, fromOwner: boolean, businessConnectionId?: string): Promise<void> {
    if (isProd && chatId !== TOODIE_USER_ID) return;
    if (fromOwner) {
      await this.draftService.onOwnerReply(chatId);
      await this.nudgeService.onOwnerReply(chatId);
    } else {
      this.draftService.scheduleSuggestion(chatId, businessConnectionId);
      this.nudgeService.scheduleNudge(chatId, businessConnectionId);
    }
  }

  private async draftSendHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }
    await this.draftService.handleSend(ctx);
  }

  private async draftCancelHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }
    // Cancelling a suggestion also stands down the 1-hour forgotten-reply nudge for that chat.
    const chatId = await this.draftService.handleCancel(ctx);
    if (chatId !== null) await this.nudgeService.onOwnerReply(chatId);
  }

  private async nudgeReplyHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }
    await this.nudgeService.handleReply(ctx);
  }

  private async nudgeSnoozeHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }
    await this.nudgeService.handleSnooze(ctx);
  }

  private async nudgeDismissHandler(ctx: Context): Promise<void> {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery();
      return;
    }
    await this.nudgeService.handleDismiss(ctx);
  }

  private async transcribe(fileId: string): Promise<string> {
    try {
      const audioFilePath = await downloadFile(this.bot, fileId, LOCAL_FILES_PATH);
      return await getTranscriptFromAudio(audioFilePath);
    } catch (err) {
      this.logger.error(`Failed to transcribe audio: ${err}`);
      return '';
    }
  }

  private async transcribeDmHandler(ctx: Context): Promise<void> {
    const fileId = ctx.message?.voice?.file_id ?? ctx.message?.audio?.file_id;
    if (!fileId) return;

    const transcript = await this.transcribe(fileId);
    if (!transcript) {
      await ctx.reply('Could not transcribe the audio.');
      return;
    }

    await ctx.reply(`${TRANSCRIPTION_HEADER}\n${transcript}`);
  }
}
