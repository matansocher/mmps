import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { GENERAL_ERROR_MESSAGE, INITIAL_BOT_RESPONSE } from './finance-teacher-bot.config';
import { Inject, Injectable } from '@nestjs/common';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import TelegramBot, { Message } from 'node-telegram-bot-api';

@Injectable()
export class FinanceTeacherBotService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.FINANCE_TEACHER.name) private readonly bot: TelegramBot,
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
      await this.telegramGeneralService.sendMessage(this.bot, chatId, INITIAL_BOT_RESPONSE);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, GENERAL_ERROR_MESSAGE);
    }
  }
}
