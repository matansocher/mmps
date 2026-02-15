import type { Bot, Context } from 'grammy';
import { env } from 'node:process';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { analyzeImage } from '@services/openai/utils/analyze-image';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getMessageData, MessageLoader, sendStyledMessage } from '@services/telegram';
import { IMAGE_ANALYSIS_PROMPT } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.command('help', (ctx) => this.helpHandler(ctx));
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
      await sendStyledMessage(this.bot, chatId, replyText);
    });
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(text, chatId);
      await this.handleBotResponse(chatId, replyText, toolResults);
    });
  }

  private async handleBotResponse(chatId: number, replyText: string, toolResults: any[]): Promise<void> {
    this.logger.log(`bot response for chatId ${chatId}: ${replyText}`);
    await sendStyledMessage(this.bot, chatId, replyText);
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

      await sendStyledMessage(this.bot, chatId, message);
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
