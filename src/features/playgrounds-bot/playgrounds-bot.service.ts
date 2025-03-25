import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getMessageData, registerHandlers, sendMessageInStyle, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { PLAYGROUNDS_BOT_COMMANDS } from './playgrounds-bot.config';

@Injectable()
export class PlaygroundsBotService implements OnModuleInit {
  private readonly logger = new Logger(PlaygroundsBotService.name);

  constructor(
    private readonly openaiAssistantService: OpenaiAssistantService,
    @Inject(BOTS.PLAYGROUNDS.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(PLAYGROUNDS_BOT_COMMANDS));
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START, POLL, STOCK } = PLAYGROUNDS_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: POLL.command, handler: (message) => this.pollHandler.call(this, message) },
      { event: COMMAND, regex: STOCK.command, handler: (message) => this.stockHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const replyMessage = 'this is a very long message and we want to send each word separately so it looks like it is being written live';
    await sendMessageInStyle(this.bot, chatId, replyMessage);
  }

  private async pollHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // allows_multiple_answers: boolean
    // is_anonymous: boolean
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: true });
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: false });
  }

  private async stockHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // https://chatgpt.com/c/67e13862-b9ec-8001-ae2e-69929183ccc1

    const { id: threadId } = await this.openaiAssistantService.createThread();
    await this.openaiAssistantService.addMessageToThread(threadId, 'Give me stock info for TSLA');
    await this.openaiAssistantService.getStockFromAssistant('asst_cy1i5gvBLDpbKe8JRS10VxnL', threadId);
    const response = await this.openaiAssistantService.getThreadResponse(threadId);
    this.bot.sendMessage(chatId, response);
  }
}
