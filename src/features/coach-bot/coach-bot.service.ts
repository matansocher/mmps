import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData } from '@services/telegram';
import { CoachBotSchedulerService } from './coach-scheduler.service';

@Injectable()
export class CoachBotService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotService.name);

  constructor(
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly coachBotSchedulerService: CoachBotSchedulerService,
    @Inject(BOTS.COACH.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.COACH.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.COACH.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.startHandler.name, `${logBody} - start`);
      const INITIAL_BOT_RESPONSE = [`Hey There 👋`, `I am here to provide you with results of football matches.`].join('\n\n');
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.logger.log(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, 'Sorry, I am unable to process your request at the moment. Please try again later.');
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = getMessageData(message);
    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(this.textHandler.name, `${logBody} - start`);

    try {
      await this.coachBotSchedulerService.handleIntervalFlow(text);
      this.logger.log(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }
}
