import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { Inject, Injectable } from '@nestjs/common';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import TelegramBot, { Message } from 'node-telegram-bot-api';

@Injectable()
export class RollinsparkService {

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.ROLLINSPARK.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TABIT.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TABIT.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      const replyText = `Hello, I will let you know when I find a new appartment in rollins park for you.`;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}
