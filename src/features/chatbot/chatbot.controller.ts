import type { Bot, Context } from 'grammy';
import type { ReactionTypeEmoji } from 'grammy/types';
import { env } from 'node:process';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { analyzeImage } from '@services/openai/utils/analyze-image';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getMessageData, MessageLoader, sendRichMessage } from '@services/telegram';
import { IMAGE_ANALYSIS_PROMPT } from './chatbot.config';
import { ChatbotService } from './chatbot.service';
import { ChatbotLauncherService } from './launcher.service';

export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
    private readonly launcher: ChatbotLauncherService,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.command('help', (ctx) => this.helpHandler(ctx));
    this.bot.command('app', (ctx) => this.appHandler(ctx));
    this.bot.command('exercise', (ctx) => this.exerciseHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
    this.bot.on('message:photo', (ctx) => this.photoHandler(ctx));
    this.bot.on(['message:audio', 'message:voice'], (ctx) => this.audioHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    await ctx.reply('Hi, I am your chatbot! How can I assist you today?');
  }

  private async helpHandler(ctx: Context): Promise<void> {
    const { chatId, messageId } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const prompt = `List all your available tools with a short and concise explanation for each. Keep each tool description to 1-2 sentences maximum. Format as a clear, easy-to-scan list.`;
      const { message: replyText } = await this.chatbotService.processMessage(prompt, chatId);
      await sendRichMessage(this.bot, chatId, replyText);
    });
  }

  private async appHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    await this.launcher.sendLauncher(chatId);
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
