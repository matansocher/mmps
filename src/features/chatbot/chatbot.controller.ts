import type { Bot, Context } from 'grammy';
import type { ReactionTypeEmoji } from 'grammy/types';
import { LOCAL_FILES_PATH, MY_USER_ID, WIFE_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getCallbackQueryData, getMessageData, MessageLoader, sendRichMessage } from '@services/telegram';
import { getPendingRemindersDueOnOrBefore, getReminderById, updateReminderStatus } from '@shared/reminders';
import { addExercise } from '@shared/trainer';
import { ChatbotService } from './chatbot.service';
import {
  buildSummaryRemindersKeyboard,
  describeSnoozeOption,
  parseBirthdayCallbackData,
  parseExerciseCallbackData,
  parseReminderCallbackData,
  parseSummaryReminderCallbackData,
  resolveSnoozeUntil,
  sendExerciseReminder,
} from './schedulers';
import {
  ACTION_CALLBACK_PREFIX,
  buildActionsKeyboard,
  CHECK_IN_MESSAGE,
  CHECK_IN_SEND_CALLBACK,
  getActionByShortId,
  getActionsByMessageId,
  OWNER_BUSINESS_CONNECTION_ID,
  type SecretaryActionService,
  type SecretaryMessageService,
  TRANSCRIPTION_HEADER,
  updateActionStatus,
} from './secretary';
import { fileToDataUrl } from './utils';

const EXERCISE_REMIND_DELAY_MS = 60 * 60 * 1000;

const isOwner = (ctx: Context): boolean => ctx.from?.id === MY_USER_ID;

export class ChatbotController {
  private readonly logger = new Logger('chatbot:controller');

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
    private readonly secretaryMessageService: SecretaryMessageService,
    private readonly secretaryActionService: SecretaryActionService,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.on('business_connection', (ctx) => this.businessConnectionHandler(ctx));
    this.bot.on('business_message', (ctx) => this.businessMessageHandler(ctx));
    this.bot.callbackQuery(CHECK_IN_SEND_CALLBACK, (ctx) => this.checkInSendHandler(ctx));
    this.bot.callbackQuery(new RegExp(`^${ACTION_CALLBACK_PREFIX}`), (ctx) => this.secretaryActionHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
    this.bot.on('message:photo', (ctx) => this.photoHandler(ctx));
    this.bot.on(['message:audio', 'message:voice'], (ctx) => this.audioHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    await ctx.reply('Hi, I am your chatbot! How can I assist you today?');
  }

  private businessConnectionHandler(ctx: Context): void {
    const connection = ctx.businessConnection;
    if (!connection) return;
    this.logger.log(`Business connection: id=${connection.id} enabled=${connection.is_enabled} userChatId=${connection.user_chat_id}`);
  }

  // Log every business-chat message (both sides). Voice notes are transcribed, echoed into the
  // chat as the owner, and stored so the daily summary stays complete.
  private async businessMessageHandler(ctx: Context): Promise<void> {
    const message = ctx.businessMessage;
    if (!message) return;

    const chatId = message.chat.id;
    const fromOwner = ctx.from?.id === MY_USER_ID;
    const senderName = ctx.from?.first_name ?? undefined;
    const senderUsername = ctx.from?.username ?? undefined;
    const businessConnectionId = message.business_connection_id;

    const voiceFileId = message.voice?.file_id ?? message.audio?.file_id;

    if (voiceFileId) {
      const transcript = await this.transcribeBusinessVoice(voiceFileId);
      if (transcript) {
        await this.bot.api.sendMessage(chatId, `${TRANSCRIPTION_HEADER}\n${transcript}`, businessConnectionId ? { business_connection_id: businessConnectionId } : undefined);
        await this.secretaryMessageService.storeMessage({ chatId, fromOwner, text: transcript, transcribed: true, senderName, senderUsername });
      }
      return;
    }

    const text = message.text ?? message.caption;
    if (!text) return;

    await this.secretaryMessageService.storeMessage({ chatId, fromOwner, text, senderName, senderUsername });
  }

  private async transcribeBusinessVoice(fileId: string): Promise<string> {
    try {
      const audioFilePath = await downloadFile(this.bot, fileId, LOCAL_FILES_PATH);
      return await getTranscriptFromAudio(audioFilePath);
    } catch (err) {
      this.logger.error(`Failed to transcribe business voice: ${getErrorMessage(err)}`);
      return '';
    }
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
      await this.bot.api.sendMessage(WIFE_USER_ID, CHECK_IN_MESSAGE, { business_connection_id: OWNER_BUSINESS_CONNECTION_ID });
      await ctx.editMessageText(`Sent ✅\n\n"${CHECK_IN_MESSAGE}"`);
      await ctx.answerCallbackQuery({ text: 'Sent ✅' });
    } catch (err) {
      this.logger.error(`Failed to send check-in message: ${getErrorMessage(err)}`);
      await ctx.answerCallbackQuery({ text: 'Failed to send.', show_alert: true });
    }
  }

  // One-tap execution of a suggested calendar/reminder action via the AI agent.
  private async secretaryActionHandler(ctx: Context): Promise<void> {
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

    await ctx.answerCallbackQuery({ text: 'Working… ⏳' });

    const { ok, text } = await this.secretaryActionService.execute(action.instruction);
    await updateActionStatus(shortId, ok ? 'done' : 'failed', text);

    if (action.messageId) {
      try {
        const refreshed = await getActionsByMessageId(action.messageId);
        await ctx.editMessageReplyMarkup({ reply_markup: buildActionsKeyboard(refreshed) });
      } catch (err) {
        this.logger.error(`Failed to refresh action keyboard: ${getErrorMessage(err)}`);
      }
    }

    await ctx.reply(`${ok ? '✅' : '❌'} ${text}`);
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { data } = getCallbackQueryData(ctx);

    if (parseReminderCallbackData(data)) {
      await this.handleReminderCallback(ctx);
      return;
    }
    if (parseSummaryReminderCallbackData(data)) {
      await this.handleSummaryReminderCallback(ctx);
      return;
    }
    if (parseExerciseCallbackData(data)) {
      await this.handleExerciseCallback(ctx);
      return;
    }
    if (parseBirthdayCallbackData(data)) {
      await this.handleBirthdayCallback(ctx);
      return;
    }

    await ctx.answerCallbackQuery().catch(() => {});
  }

  private async handleReminderCallback(ctx: Context): Promise<void> {
    const { chatId, data } = getCallbackQueryData(ctx);

    const parsed = parseReminderCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    try {
      const reminder = await getReminderById(parsed.reminderId, chatId);
      if (!reminder) {
        await ctx.answerCallbackQuery({ text: 'Reminder not found.', show_alert: true }).catch(() => {});
        return;
      }

      if (parsed.action === 'done') {
        await updateReminderStatus(parsed.reminderId, chatId, 'completed');
        await ctx.editMessageText(`✅ *Done*\n${reminder.message}`, { parse_mode: 'Markdown' }).catch(() => {});
        await ctx.answerCallbackQuery({ text: 'Marked as done' }).catch(() => {});
        return;
      }

      const option = parsed.option ?? '1h';
      const snoozeUntil = resolveSnoozeUntil(option);
      await updateReminderStatus(parsed.reminderId, chatId, 'snoozed', snoozeUntil);
      const label = describeSnoozeOption(option);
      await ctx.editMessageText(`😴 *Snoozed for ${label}*\n${reminder.message}`, { parse_mode: 'Markdown' }).catch(() => {});
      await ctx.answerCallbackQuery({ text: `Snoozed for ${label}` }).catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling reminder callback: ${getErrorMessage(err)}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true }).catch(() => {});
    }
  }

  private async handleSummaryReminderCallback(ctx: Context): Promise<void> {
    const { chatId, data } = getCallbackQueryData(ctx);

    const parsed = parseSummaryReminderCallbackData(data);
    if (!parsed) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    try {
      const reminder = await getReminderById(parsed.reminderId, chatId);
      if (!reminder) {
        await ctx.answerCallbackQuery({ text: 'Reminder not found.', show_alert: true }).catch(() => {});
        return;
      }

      let toast: string;
      if (parsed.action === 'complete') {
        await updateReminderStatus(parsed.reminderId, chatId, 'completed');
        toast = 'Marked as done';
      } else {
        const snoozeUntil = resolveSnoozeUntil('morning');
        await updateReminderStatus(parsed.reminderId, chatId, 'snoozed', snoozeUntil);
        toast = 'Snoozed for tomorrow morning';
      }

      // Keep the summary text intact and only refresh the buttons to drop the reminder that was just handled.
      // A reminder snoozed into the future keeps its (past) dueDate, so exclude anything snoozed for later.
      const now = new Date();
      const pending = await getPendingRemindersDueOnOrBefore(chatId, now);
      const remaining = pending.filter((item) => !(item.status === 'snoozed' && item.snoozedUntil && item.snoozedUntil > now));
      await ctx.editMessageReplyMarkup({ reply_markup: buildSummaryRemindersKeyboard(remaining) }).catch(() => {});
      await ctx.answerCallbackQuery({ text: toast }).catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling summary reminder callback: ${getErrorMessage(err)}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true }).catch(() => {});
    }
  }

  private async handleExerciseCallback(ctx: Context): Promise<void> {
    const { chatId, data } = getCallbackQueryData(ctx);

    const action = parseExerciseCallbackData(data);
    if (!action) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    try {
      switch (action) {
        case 'done':
          await addExercise(chatId);
          await ctx.editMessageText('💪 *Logged!* Great work today.', { parse_mode: 'Markdown' }).catch(() => {});
          await ctx.answerCallbackQuery({ text: 'Exercise logged' }).catch(() => {});
          break;
        case 'skip':
          await ctx.editMessageText('👌 No worries, skipped for today.', { parse_mode: 'Markdown' }).catch(() => {});
          await ctx.answerCallbackQuery({ text: 'Skipped for today' }).catch(() => {});
          break;
        case 'remind':
          setTimeout(() => {
            sendExerciseReminder(this.bot, this.chatbotService).catch((err) => this.logger.error(`Failed to re-send exercise reminder: ${getErrorMessage(err)}`));
          }, EXERCISE_REMIND_DELAY_MS);
          await ctx.editMessageText('😴 Okay, I will remind you again in 1 hour.', { parse_mode: 'Markdown' }).catch(() => {});
          await ctx.answerCallbackQuery({ text: 'Reminding in 1 hour' }).catch(() => {});
          break;
      }
    } catch (err) {
      this.logger.error(`Error handling exercise callback: ${getErrorMessage(err)}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true }).catch(() => {});
    }
  }

  private async handleBirthdayCallback(ctx: Context): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);

    try {
      await ctx.answerCallbackQuery({ text: 'Drafting a message...' }).catch(() => {});
      const prompt = `Draft a warm, personal birthday message for each person whose birthday is today (check my calendar for today's birthday events). Keep each message short and heartfelt, ready to copy and send. If there are multiple birthdays, provide one message per person.`;
      const { message } = await this.chatbotService.processMessage(prompt, chatId);
      await sendRichMessage(this.bot, chatId, message);
    } catch (err) {
      this.logger.error(`Error handling birthday callback: ${getErrorMessage(err)}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true }).catch(() => {});
    }
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { text } = getMessageData(ctx);
    await this.runAgentReply(ctx, text, '🤔');
  }

  private async runAgentReply(ctx: Context, prompt: string, reactionEmoji: ReactionTypeEmoji['emoji']): Promise<void> {
    const { chatId, messageId } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(prompt, chatId);
      await this.handleBotResponse(chatId, replyText, toolResults);
    });
  }

  private async handleBotResponse(chatId: number, replyText: string, toolResults: any[]): Promise<void> {
    this.logger.log(`bot response for chatId ${chatId}: ${replyText}`);
    await sendRichMessage(this.bot, chatId, replyText);
  }

  private async photoHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, photo, text } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const imageLocalPath = await downloadFile(this.bot, photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageDataUrl = await fileToDataUrl(imageLocalPath);

      await deleteFile(imageLocalPath);

      const prompt = text?.trim() ? text : 'Please take a look at this image and respond helpfully.';
      const { message } = await this.chatbotService.processMessage(prompt, chatId, { images: [imageDataUrl] });

      await sendRichMessage(this.bot, chatId, message);
    });
  }

  private async audioHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, audio } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const audioFileLocalPath = await downloadFile(this.bot, audio.file_id, LOCAL_FILES_PATH);

      const transcribedText = await getTranscriptFromAudio(audioFileLocalPath);
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(transcribedText, chatId);

      await this.handleBotResponse(chatId, replyText, toolResults);

      deleteFile(audioFileLocalPath);
    });
  }
}
