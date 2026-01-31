import { Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { getBotToken, getMessageData, MessageLoader, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './sugar.config';
import { SugarService } from './sugar.service';

export class SugarController {
  private readonly logger = new Logger(SugarController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(private readonly sugarService: SugarService) {}

  init(): void {
    const { COMMAND, TEXT } = TELEGRAM_EVENTS;
    const { START, HELP, ACTIVE, HISTORY } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: HELP.command, handler: (message) => this.helpHandler.call(this, message) },
      { event: COMMAND, regex: ACTIVE.command, handler: (message) => this.activeHandler.call(this, message) },
      { event: COMMAND, regex: HISTORY.command, handler: (message) => this.historyHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.messageHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const welcomeMessage = [
      '🩸 *Welcome to Sugar Bot!*',
      '',
      "I help you track blood glucose responses to meals. Here's how to use me:",
      '',
      '*Starting a session:*',
      '• "Starting meal: scrambled eggs with toast"',
      '• "Eating oatmeal for breakfast"',
      '',
      '*Logging readings:*',
      '• Just send a number: "95"',
      '• With timing: "30 min: 118"',
      '• Baseline: "baseline 92"',
      '',
      '*Ending a session:*',
      '• "done" or "finished"',
      '',
      '*Analyzing your data:*',
      '• "How does oatmeal affect me?"',
      '• "Compare rice vs bread"',
      '• "My trends this week"',
      '',
      'Start tracking by telling me what you\'re eating!',
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }

  private async helpHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const helpMessage = [
      '❓ *Sugar Bot Help*',
      '',
      '*Commands:*',
      '/start - Welcome message',
      '/help - Show this help',
      '/active - Show current active session',
      '/history - Show recent sessions',
      '',
      '*Tracking Workflow:*',
      '1. Tell me what you\'re eating to start',
      '2. Log your baseline glucose (0 min)',
      '3. Log readings at 30, 60, 120 min',
      '4. Say "done" to close the session',
      '',
      '*Example Session:*',
      '"Eating toast with butter"',
      '"92" (baseline)',
      '"115 at 30 min"',
      '"108 at 60 min"',
      '"done"',
      '',
      '*Analytics:*',
      '• Ask about specific foods',
      '• Compare different foods',
      '• View trends over time',
    ].join('\n');

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  private async activeHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '📊' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText } = await this.sugarService.processMessage('Show my active session', chatId);
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(() => this.bot.sendMessage(chatId, replyText));
    });
  }

  private async historyHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '📜' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText } = await this.sugarService.processMessage('Show my recent sessions', chatId);
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(() => this.bot.sendMessage(chatId, replyText));
    });
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, text } = getMessageData(message);

    // Skip if it's a command
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🩸' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const { message: replyText } = await this.sugarService.processMessage(text, chatId);
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(() => this.bot.sendMessage(chatId, replyText));
    });
  }
}
