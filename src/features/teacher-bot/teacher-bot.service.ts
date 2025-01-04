import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { TeacherService } from '@services/teacher';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { INITIAL_BOT_RESPONSE, TEACHER_BOT_OPTIONS } from './teacher-bot.config';
import { CourseStatus } from '@core/mongo/teacher-mongo/models/course.model';

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
    this.bot.onText(/\/course/, (message: Message) => this.courseHandler(message));
    this.bot.onText(/\/lesson/, (message: Message) => this.lessonHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
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

  async courseHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.courseHandler.name, `${logBody} - start`);
      await this.teacherService.startNewCourse();
      this.logger.info(this.courseHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.courseHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage);
    }
  }

  async lessonHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.lessonHandler.name, `${logBody} - start`);
      await this.teacherService.processLesson(false);
      this.logger.info(this.lessonHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.lessonHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, errorMessage);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = this.telegramGeneralService.getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TEACHER_BOT_OPTIONS).map((option: string) => TEACHER_BOT_OPTIONS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      if (text.startsWith('/add')) {
        const course = text.replace('/add', '').trim();
        await this.teacherService.addCourse(course);
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `OK, I added ${course} to your courses list`);
        this.logger.info(this.textHandler.name, `${logBody} - added course '${course}' - success`);
        return;
      }
      await this.teacherService.processQuestion(MY_USER_ID, text);
      this.logger.info(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}
