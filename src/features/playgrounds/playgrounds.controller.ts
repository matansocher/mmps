import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_CONFIG } from './playgrounds.config';

@Injectable()
export class PlaygroundsController implements OnModuleInit {
  private readonly logger = new Logger(PlaygroundsController.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START, POLL } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: POLL.command, handler: (message) => this.pollHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const replyMessage = 'this is a very long message and we want to send each word separately so it looks like it is being written live';
    // await sendMessageInStyle(this.bot, chatId, replyMessage);
  }

  private async pollHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // allows_multiple_answers: boolean
    // is_anonymous: boolean
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: true });
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: false });
  }
}
