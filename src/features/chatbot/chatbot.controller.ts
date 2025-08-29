import TelegramBot, { Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { NotifierService } from '@core/notifier';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { downloadAudio, getBotToken, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, TelegramMessageData } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

@Injectable()
export class ChatbotController implements OnModuleInit {
  private readonly logger = new Logger(ChatbotController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, TEXT, PHOTO, AUDIO, VOICE } = TELEGRAM_EVENTS;
    const { START } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.messageHandler.call(this, message) },
      { event: PHOTO, handler: (message) => this.photoHandler.call(this, message) },
      { event: AUDIO, handler: (message) => this.audioHandler.call(this, message) },
      { event: VOICE, handler: (message) => this.audioHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.bot.sendMessage(chatId, 'Hi, I am your chatbot! How can I assist you today?');
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText, toolResults } = await this.chatbotService.processMessage(text, chatId.toString());

      const ttsResult = toolResults.find((result) => result.toolName === 'text_to_speech');
      const imageGeneratorResult = toolResults.find((result) => result.toolName === 'image_generator');

      if (ttsResult && !ttsResult.error) {
        const audioFilePath = ttsResult.data;
        try {
          await this.bot.sendVoice(chatId, audioFilePath);
          deleteFile(audioFilePath);
        } catch (err) {
          this.logger.error(`Error sending voice message: ${err}`);
          await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
        }
      } else if (imageGeneratorResult && !imageGeneratorResult.error) {
        try {
          await this.bot.sendPhoto(chatId, replyText, { caption: replyText });
        } catch (err) {
          this.logger.error(`Error sending voice message: ${err}`);
          await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
        }
      } else {
        await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
      }
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text }, userDetails);
  }

  private async photoHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, photo } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const imageLocalPath = await this.bot.downloadFile(photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, imageLocalPath);

      deleteFile(imageLocalPath);

      const imageAnalysisPrompt = `Please analyze this image: ${imageUrl}`;
      const { message } = await this.chatbotService.processMessage(imageAnalysisPrompt, chatId.toString());

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text: 'Image sent' }, userDetails);
  }

  private async audioHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, audio } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🎧' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const audioFileLocalPath = await downloadAudio(this.bot, audio, LOCAL_FILES_PATH);

      const transcriptionPrompt = `Please transcribe this audio file: ${audioFileLocalPath}`;
      const { message } = await this.chatbotService.processMessage(transcriptionPrompt, chatId.toString());

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text: 'Audio sent' }, userDetails);
  }
}
