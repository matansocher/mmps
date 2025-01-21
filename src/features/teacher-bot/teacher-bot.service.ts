import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile, getErrorMessage } from '@core/utils';
import { AiService } from '@services/ai';
import { BOTS, getMessageData, downloadAudioFromVideoOrAudio, TELEGRAM_EVENTS } from '@services/telegram';
import { TeacherService } from './teacher.service';
import { INITIAL_BOT_RESPONSE, NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW, TEACHER_BOT_OPTIONS } from './teacher-bot.config';

@Injectable()
export class TeacherBotService implements OnModuleInit {
  private readonly logger = new Logger(TeacherBotService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly teacherService: TeacherService,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.START), (message: Message) => this.startHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.COURSE), (message: Message) => this.courseHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.LESSON), (message: Message) => this.lessonHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.LIST), (message: Message) => this.listHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.ADD), (message: Message) => this.addHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.REMOVE), (message: Message) => this.removeHandler(message));
    this.bot.on(TELEGRAM_EVENTS.MESSAGE, (message: Message) => this.handleMessage(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.startHandler.name} - ${logBody} - start`);
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.logger.log(`${this.startHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.startHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async courseHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.courseHandler.name} - ${logBody} - start`);
      await this.teacherService.startNewCourse(chatId);
      this.logger.log(`${this.courseHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.courseHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async lessonHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.lessonHandler.name} - ${logBody} - start`);
      await this.teacherService.processLesson(chatId, false);
      this.logger.log(`${this.lessonHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.lessonHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.listHandler.name} - ${logBody} - start`);
      let courses = await this.teacherService.getCoursesList();
      if (!courses?.length) {
        await this.bot.sendMessage(chatId, 'I see you dont have any unfinished courses\nYou can add one with the /add command');
        return;
      }
      let messagePrefix = 'Available Courses';
      const isListTooBig = courses.length > NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW;
      if (isListTooBig) {
        courses = courses.slice(0, NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW);
        messagePrefix = `Available Courses list it too big, showing the random first ${NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW}`;
      }
      const coursesStr = courses.map(({ _id, topic }) => `\`${_id}\` - ${topic}`).join('\n');
      const resText = `${messagePrefix}:\n\n${coursesStr}`;
      await this.sendMarkdownMessage(chatId, resText);
      this.logger.log(`${this.listHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.listHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async addHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.addHandler.name} - ${logBody} - start`);
      const course = text.replace(TEACHER_BOT_OPTIONS.ADD, '').trim();
      await this.teacherService.addCourse(course);
      await this.bot.sendMessage(chatId, `OK, I added \`${course}\` to your courses list`);
      this.logger.log(`${this.handleMessage.name} - ${logBody} - added course '${course}' - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.addHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async removeHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.removeHandler.name} - ${logBody} - start`);
      const courseId = text.replace(TEACHER_BOT_OPTIONS.REMOVE, '').trim();
      await this.teacherService.removeCourse(courseId);
      await this.bot.sendMessage(chatId, 'OK, I removed that course');
      this.logger.log(`${this.removeHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.removeHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async handleMessage(message: Message) {
    const { chatId, firstName, lastName, text, audio } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TEACHER_BOT_OPTIONS).some((option: string) => text.includes(TEACHER_BOT_OPTIONS[option]))) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(`${this.handleMessage.name} - ${logBody} - start`);

    try {
      let question = text;
      if (audio) {
        const { audioFileLocalPath } = await downloadAudioFromVideoOrAudio(this.bot, { audio, video: null }, LOCAL_FILES_PATH);
        const resText = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
        await deleteFile(audioFileLocalPath);
        question = resText;
      }

      await this.teacherService.processQuestion(chatId, question);
      this.logger.log(`${this.handleMessage.name} - ${logBody} - success`);
    } catch (err) {
      this.logger.error(`${this.handleMessage.name} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async sendMarkdownMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (err) {
      await this.bot.sendMessage(chatId, message);
    }
  }
}
