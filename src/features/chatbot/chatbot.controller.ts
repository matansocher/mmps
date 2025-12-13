import { Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadAudio, getBotToken, getMessageData, MessageLoader, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    const { COMMAND, TEXT, PHOTO, AUDIO, VOICE } = TELEGRAM_EVENTS;
    const { START, HELP } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: HELP.command, handler: (message) => this.helpHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.messageHandler.call(this, message) },
      { event: PHOTO, handler: (message) => this.photoHandler.call(this, message) },
      { event: AUDIO, handler: (message) => this.audioHandler.call(this, message) },
      { event: VOICE, handler: (message) => this.audioHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, 'Hi, I am your chatbot! How can I assist you today?');
  }

  private async helpHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '❓' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const prompt = `List all your available tools with a short and concise explanation for each. Keep each tool description to 1-2 sentences maximum. Format as a clear, easy-to-scan list.`;
      const { message: replyText } = await this.chatbotService.processMessage(prompt, chatId);
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(() => {
        this.bot.sendMessage(chatId, replyText);
      });
    });
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(text, chatId);
      await this.handleBotResponse(chatId, replyText, toolResults);
    });
  }

  private async handleBotResponse(chatId: number, replyText: string, toolResults: any[]): Promise<void> {
    const ttsResult = toolResults.find((result) => result.toolName === 'text_to_speech');
    const mapsResult = toolResults.find((result) => result.toolName === 'google_maps_place');

    this.logger.log(`bot response for chatId ${chatId}: ${replyText}`);

    if (ttsResult && !ttsResult.error) {
      const audioFilePath = ttsResult.data;
      try {
        await this.bot.sendVoice(chatId, audioFilePath);
        deleteFile(audioFilePath);
      } catch (err) {
        this.logger.error(`Error sending voice message: ${err}`);
        await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
      }
    } else if (mapsResult && !mapsResult.error) {
      const imageFilePath = mapsResult.data;
      try {
        await this.bot.sendPhoto(chatId, imageFilePath, { caption: replyText }).catch((err) => {
          this.logger.error(`Error sending photo: ${err}. Sending as text message instead.`);
          this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(() => {});
        });
        deleteFile(imageFilePath);
      } catch (err) {
        this.logger.error(`Error sending photo message: ${err}`);
        await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
      }
    } else {
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
    }
  }

  private async photoHandler(message: Message): Promise<void> {
    const { chatId, messageId, photo } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const imageLocalPath = await this.bot.downloadFile(photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, imageLocalPath);

      deleteFile(imageLocalPath);

      const imageAnalysisPrompt = `Please analyze this image: ${imageUrl}`;
      const { message } = await this.chatbotService.processMessage(imageAnalysisPrompt, chatId);

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  }

  private async audioHandler(message: Message): Promise<void> {
    const { chatId, messageId, audio } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🎧' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const audioFileLocalPath = await downloadAudio(this.bot, audio, LOCAL_FILES_PATH);

      const transcribedText = await getTranscriptFromAudio(audioFileLocalPath);
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(transcribedText, chatId);

      await this.handleBotResponse(chatId, replyText, toolResults);

      deleteFile(audioFileLocalPath);
    });
  }
}
