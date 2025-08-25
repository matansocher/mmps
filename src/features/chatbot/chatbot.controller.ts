import TelegramBot, { Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { getBotToken, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
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
    const { COMMAND, MESSAGE } = TELEGRAM_EVENTS;
    const { START } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
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
      const replyText = await this.chatbotService.processMessage(text, chatId.toString());
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text }, userDetails);
  }
}
