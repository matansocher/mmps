import TelegramBot, { Message } from 'node-telegram-bot-api';
import { OpenAI } from 'openai';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OpenaiAssistantService } from '@services/openai';
import { OPENAI_CLIENT_TOKEN } from '@services/openai/openai.config';
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
    const { START, POLL } = PLAYGROUNDS_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: POLL.command, handler: (message) => this.pollHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, isBlocked: true, handlers });

    this.fuck();
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

  private async fuck(): Promise<any> {
    const completion = await this.openaiAssistantService.getStructuredResponse('how can I solve 8x + 7 = -23');
    const response = completion.choices[0].message.parsed;
    return response;
  }
}
