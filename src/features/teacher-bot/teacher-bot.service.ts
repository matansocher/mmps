import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { CourseStatus, TeacherMongoCourseService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { deleteFile, getDateString, getErrorMessage } from '@core/utils';
import { AiService } from '@services/ai';
import {
  BOTS,
  TELEGRAM_EVENTS,
  getCallbackQueryData,
  getMessageData,
  downloadAudioFromVideoOrAudio,
  sendStyledMessage
} from '@services/telegram';
import { TeacherService } from './teacher.service';
import {
  BOT_ACTIONS,
  INITIAL_BOT_RESPONSE,
  NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW,
  NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW,
  TEACHER_BOT_OPTIONS,
} from './teacher-bot.config';

@Injectable()
export class TeacherBotService implements OnModuleInit {
  private readonly logger = new Logger(TeacherBotService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly teacherService: TeacherService,
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly mongoUserPreferencesService: TeacherMongoUserPreferencesService,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit() {
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.START), (message: Message) => this.startHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.STOP), (message: Message) => this.stopHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.COURSE), (message: Message) => this.courseHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.LESSON), (message: Message) => this.lessonHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.LIST), (message: Message) => this.listHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.HISTORY), (message: Message) => this.historyHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.ADD), (message: Message) => this.addHandler(message));
    this.bot.onText(new RegExp(TEACHER_BOT_OPTIONS.REMOVE), (message: Message) => this.removeHandler(message));
    this.bot.on(TELEGRAM_EVENTS.MESSAGE, (message: Message) => this.messageHandler(message));
    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.startHandler.name} - ${logBody} - start`);
      await this.mongoUserPreferencesService.createUserPreference(chatId);
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
      this.logger.log(`${this.startHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.startHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async stopHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.stopHandler.name} - ${logBody} - start`);
      await this.bot.sendMessage(chatId, `OK, I will stop teaching you for now 🛑\n\nWhenever you are ready, just send me the ${TEACHER_BOT_OPTIONS.START} command and we will continue learning\n\nAnother option for you is to start courses manually with the ${TEACHER_BOT_OPTIONS.COURSE} command and another lesson with the ${TEACHER_BOT_OPTIONS.LESSON} command`);
      await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
      this.logger.log(`${this.stopHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.stopHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async courseHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.courseHandler.name} - ${logBody} - start`);
      await this.mongoCourseService.markActiveCourseCompleted();
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
      let courses = await this.mongoCourseService.getUnassignedCourses();
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
      const replyText = `${messagePrefix}:\n\n${coursesStr}`;
      await sendStyledMessage(this.bot, chatId, replyText);
      this.logger.log(`${this.listHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.listHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async historyHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.historyHandler.name} - ${logBody} - start`);
      let courses = await this.mongoCourseService.getCompletedCourses();
      if (!courses?.length) {
        await this.bot.sendMessage(chatId, 'I see you dont have any completed courses yet');
        return;
      }
      let messagePrefix = 'Completed Courses';
      const isListTooBig = courses.length > NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW;
      if (isListTooBig) {
        courses = courses.slice(0, NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW);
        messagePrefix = `Available Courses list it too big, showing the random first ${NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW}`;
      }

      const coursesStr = courses
        .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
        .map(({ topic, completedAt }) => `${getDateString(completedAt)} | ${topic}`)
        .join('\n');
      const replyText = `${messagePrefix}:\n\n${coursesStr}`;
      await this.bot.sendMessage(chatId, replyText);
      this.logger.log(`${this.historyHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.historyHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async addHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${this.addHandler.name} - ${logBody} - start`);
      const course = text.replace(TEACHER_BOT_OPTIONS.ADD, '').trim();
      await this.mongoCourseService.addCourse(course);
      await this.bot.sendMessage(chatId, `OK, I added \`${course}\` to your courses list`);
      this.logger.log(`${this.addHandler.name} - ${logBody} - added course '${course}' - success`);
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
      await this.mongoCourseService.removeCourse(courseId);
      await this.bot.sendMessage(chatId, 'OK, I removed that course');
      this.logger.log(`${this.removeHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.removeHandler.name} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  async messageHandler(message: Message) {
    const { chatId, firstName, lastName, text, audio } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TEACHER_BOT_OPTIONS).some((option: string) => text.includes(TEACHER_BOT_OPTIONS[option]))) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(`${this.messageHandler.name} - ${logBody} - start`);

    try {
      const activeCourse = await this.mongoCourseService.getActiveCourse();
      if (!activeCourse) {
        await this.bot.sendMessage(chatId, `I see you dont have an active course\nIf you want to start a new one, just use the ${TEACHER_BOT_OPTIONS.COURSE} command`);
        return;
      }

      let question = text;
      if (audio) {
        const { audioFileLocalPath } = await downloadAudioFromVideoOrAudio(this.bot, { audio, video: null }, LOCAL_FILES_PATH);
        const replyText = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
        await deleteFile(audioFileLocalPath);
        question = replyText;
      }

      await this.teacherService.processQuestion(chatId, question);
      this.logger.log(`${this.messageHandler.name} - ${logBody} - success`);
    } catch (err) {
      this.logger.error(`${this.messageHandler.name} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: response } = getCallbackQueryData(callbackQuery);
    const logBody = `${TELEGRAM_EVENTS.CALLBACK_QUERY} :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, response: ${response}`;
    this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - start`);

    try {
      const [courseId, action] = response.split(' - ');
      switch (action) {
        case BOT_ACTIONS.COMPLETE:
          await this.handleCallbackCompleteCourse(chatId, courseId);
          break;
        default:
          throw new Error('Invalid action');
      }
      this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error: ${getErrorMessage(err)}`;
      this.logger.error(`${this.callbackQueryHandler.name} - ${logBody} - ${errorMessage}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  async handleCallbackCompleteCourse(chatId: number, courseId: string) {
    const course = await this.mongoCourseService.getCourse(courseId);
    if (!course) {
      await this.bot.sendMessage(chatId, 'I am sorry but I couldnt find that course');
      return;
    }

    if (course.status === CourseStatus.Completed) {
      await this.bot.sendMessage(chatId, 'It looks like you already completed that course');
      return;
    }

    await this.mongoCourseService.markCourseCompleted(courseId);
    this.bot.sendMessage(chatId, 'Great 👏\nLet me know once you are ready for the next course');
  }
}
