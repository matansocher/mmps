import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, getMessageData, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { PLAYGROUNDS_BOT_COMMANDS } from './playgrounds-bot.config';

@Injectable()
export class PlaygroundsBotService implements OnModuleInit {
  private readonly logger = new Logger(PlaygroundsBotService.name);

  constructor(@Inject(BOTS.PLAYGROUNDS.id) private readonly bot: TelegramBot) {}

  onModuleInit() {
    this.bot.setMyCommands(Object.values(PLAYGROUNDS_BOT_COMMANDS));
    const { COMMAND } = TELEGRAM_EVENTS;
    const { START, POLL } = PLAYGROUNDS_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: POLL.command, handler: (message) => this.pollHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, 'Hi');
  }

  private async pollHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    // allows_multiple_answers: boolean
    // is_anonymous: boolean
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: true });
    this.bot.sendPoll(chatId, 'what do you think about me as a bot?', ['1', '2', '3', '4', '5'], { allows_multiple_answers: false });
  }
}
