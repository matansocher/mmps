import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData } from '@services/telegram';
import { TeacherService } from './teacher.service';
import { INITIAL_BOT_RESPONSE, TEACHER_BOT_OPTIONS } from './teacher-bot.config';

@Injectable()
export class TeacherBotService implements OnModuleInit {
  private readonly logger = new Logger(TeacherBotService.name);

  constructor(
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
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.startHandler.name, `${logBody} - start`);
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.logger.log(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.startHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async courseHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.courseHandler.name, `${logBody} - start`);
      await this.teacherService.startNewCourse(chatId);
      this.logger.log(this.courseHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.courseHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async lessonHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.lessonHandler.name, `${logBody} - start`);
      await this.teacherService.processLesson(chatId, false);
      this.logger.log(this.lessonHandler.name, `${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(this.lessonHandler.name, `${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TEACHER_BOT_OPTIONS).map((option: string) => TEACHER_BOT_OPTIONS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(this.textHandler.name, `${logBody} - start`);

    try {
      if (text.startsWith('/add')) {
        const course = text.replace('/add', '').trim();
        await this.teacherService.addCourse(course);
        await this.bot.sendMessage(chatId, `OK, I added ${course} to your courses list`);
        this.logger.log(this.textHandler.name, `${logBody} - added course '${course}' - success`);
        return;
      }
      await this.teacherService.processQuestion(chatId, text);
      this.logger.log(this.textHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.textHandler.name, `error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }
}
