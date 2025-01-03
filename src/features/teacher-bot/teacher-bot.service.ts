import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { TeacherService } from '@services/teacher';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { INITIAL_BOT_RESPONSE } from './teacher-bot.config';

@Injectable()
export class TeacherBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly teacherService: TeacherService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.PROGRAMMING_TEACHER.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.PROGRAMMING_TEACHER.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/lesson/, (message: Message) => this.lessonHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, INITIAL_BOT_RESPONSE);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.startHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage);
    }
  }

  async lessonHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.lessonHandler.name, `${logBody} - start`);
      await this.teacherService.processLesson();
      this.logger.info(this.lessonHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.lessonHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage);
    }
  }
}
