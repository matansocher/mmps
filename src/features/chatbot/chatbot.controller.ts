import type { Bot, Context } from 'grammy';
import type { ReactionTypeEmoji } from 'grammy/types';
import { env } from 'node:process';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { analyzeImage } from '@services/openai/utils/analyze-image';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getCallbackQueryData, getMessageData, MessageLoader, sendRichMessage } from '@services/telegram';
import { getReminderById, updateReminderStatus } from '@shared/reminders';
import { addExercise } from '@shared/trainer';
import { IMAGE_ANALYSIS_PROMPT } from './chatbot.config';
import { ChatbotService } from './chatbot.service';
import { describeSnoozeOption, parseBirthdayCallbackData, parseExerciseCallbackData, parseReminderCallbackData, resolveSnoozeUntil, sendExerciseReminder } from './schedulers';

const EXERCISE_REMIND_DELAY_MS = 60 * 60 * 1000;

export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.command('exercise', (ctx) => this.exerciseHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
    this.bot.on('message:photo', (ctx) => this.photoHandler(ctx));
    this.bot.on(['message:audio', 'message:voice'], (ctx) => this.audioHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    await ctx.reply('Hi, I am your chatbot! How can I assist you today?');
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { data } = getCallbackQueryData(ctx);

    if (parseReminderCallbackData(data)) {
      await this.handleReminderCallback(ctx);
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
      this.logger.error(`Error handling reminder callback: ${err}`);
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
            sendExerciseReminder(this.bot, this.chatbotService).catch((err) => this.logger.error(`Failed to re-send exercise reminder: ${err}`));
          }, EXERCISE_REMIND_DELAY_MS);
          await ctx.editMessageText('😴 Okay, I will remind you again in 1 hour.', { parse_mode: 'Markdown' }).catch(() => {});
          await ctx.answerCallbackQuery({ text: 'Reminding in 1 hour' }).catch(() => {});
          break;
      }
    } catch (err) {
      this.logger.error(`Error handling exercise callback: ${err}`);
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
      this.logger.error(`Error handling birthday callback: ${err}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true }).catch(() => {});
    }
  }

  private async exerciseHandler(ctx: Context): Promise<void> {
    await this.runAgentReply(ctx, 'I exercised', '🔥');
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
    const { chatId, messageId, photo } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const imageLocalPath = await downloadFile(this.bot, photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, imageLocalPath);

      deleteFile(imageLocalPath);

      const analysis = await analyzeImage(IMAGE_ANALYSIS_PROMPT, imageUrl);
      const { message } = await this.chatbotService.processMessage(`Here is an analysis of an image I sent: ${analysis}\n\nPlease provide a helpful response based on this analysis.`, chatId);

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
