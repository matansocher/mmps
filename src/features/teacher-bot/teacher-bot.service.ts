import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { CourseStatus, TeacherMongoCourseService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { deleteFile, getDateString, getErrorMessage } from '@core/utils';
import { AiService } from '@services/ai';
import {
  BOTS,
  downloadAudioFromVideoOrAudio,
  getCallbackQueryData,
  getMessageData,
  sendStyledMessage,
  TELEGRAM_EVENTS,
  TelegramBotHandler,
} from '@services/telegram';
import {
  BOT_ACTIONS,
  INITIAL_BOT_RESPONSE,
  NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW,
  NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW,
  TEACHER_BOT_COMMANDS,
} from './teacher-bot.config';
import { TeacherService } from './teacher.service';

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
    this.bot.setMyCommands(Object.values(TEACHER_BOT_COMMANDS));
    const handlers: TelegramBotHandler[] = [
      { regex: TEACHER_BOT_COMMANDS.START.command, handler: this.startHandler },
      { regex: TEACHER_BOT_COMMANDS.STOP.command, handler: this.stopHandler },
      { regex: TEACHER_BOT_COMMANDS.COURSE.command, handler: this.courseHandler },
      { regex: TEACHER_BOT_COMMANDS.LESSON.command, handler: this.lessonHandler },
      { regex: TEACHER_BOT_COMMANDS.LIST.command, handler: this.listHandler },
      { regex: TEACHER_BOT_COMMANDS.HISTORY.command, handler: this.historyHandler },
      { regex: TEACHER_BOT_COMMANDS.ADD.command, handler: this.addHandler },
      { regex: TEACHER_BOT_COMMANDS.REMOVE.command, handler: this.removeHandler },
    ];
    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await this.handleCommand(message, handler.name, async () => handler.call(this, message));
      });
    });

    this.bot.on(TELEGRAM_EVENTS.MESSAGE, (message: Message) => this.messageHandler(message));
    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  private async handleCommand(message: Message, handlerName: string, handler: (chatId: number) => Promise<void>) {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(`${handlerName} - ${logBody} - start`);
      await handler(chatId);
      this.logger.log(`${handlerName} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${handlerName} - ${logBody} - error - ${errorMessage}`);
      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  private async startHandler(message: Message) {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE);
  }

  private async stopHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const replyText = [
      'OK, I will stop teaching you for now 🛑',
      `Whenever you are ready, just send me the ${TEACHER_BOT_COMMANDS.START.command} command and we will continue learning`,
      `Another option for you is to start courses manually with the ${TEACHER_BOT_COMMANDS.COURSE.command} command and another lesson with the ${TEACHER_BOT_COMMANDS.LESSON.command} command`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
  }

  private async courseHandler(message: Message) {
    const { chatId } = getMessageData(message);
    await this.mongoCourseService.markActiveCourseCompleted();
    await this.teacherService.startNewCourse(chatId);
  }

  private async lessonHandler(message: Message) {
    const { chatId } = getMessageData(message);
    await this.teacherService.processLesson(chatId, false);
  }

  private async listHandler(message: Message) {
    const { chatId } = getMessageData(message);
    let courses = await this.mongoCourseService.getUnassignedCourses();
    if (!courses?.length) {
      await this.bot.sendMessage(chatId, 'I see you dont have any unfinished courses\nYou can add one with the /add command');
      return;
    }
    let messagePrefix = 'Available Courses';
    if (courses.length > NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW) {
      courses = courses.slice(0, NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW);
      messagePrefix = `Available Courses list it too big, showing the random first ${NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW}`;
    }
    const coursesStr = courses.map(({ _id, topic }) => `\`${_id}\` - ${topic}`).join('\n');
    await sendStyledMessage(this.bot, chatId, `${messagePrefix}:\n\n${coursesStr}`);
  }

  private async historyHandler(message: Message) {
    const { chatId } = getMessageData(message);
    let courses = await this.mongoCourseService.getCompletedCourses();
    if (!courses?.length) {
      await this.bot.sendMessage(chatId, 'I see you dont have any completed courses yet');
      return;
    }
    let messagePrefix = 'Completed Courses';
    if (courses.length > NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW) {
      courses = courses.slice(0, NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW);
      messagePrefix = `Available Courses list it too big, showing the random first ${NUMBER_OF_COURSES_HISTORY_TOO_BIG_TO_SHOW}`;
    }
    const coursesStr = courses
      .sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime())
      .map(({ topic, assignedAt }) => `${getDateString(assignedAt)} | ${topic}`)
      .join('\n');
    await this.bot.sendMessage(chatId, `${messagePrefix}:\n\n${coursesStr}`);
  }

  private async addHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const course = message.text.replace(TEACHER_BOT_COMMANDS.ADD.command, '').trim();
    if (!course?.length) {
      await this.bot.sendMessage(chatId, `Please add the course name after the add command.\n example: "/add javascript arrays"`);
      return;
    }
    await this.mongoCourseService.addCourse(course);
    await this.bot.sendMessage(chatId, `OK, I added \`${course}\` to your courses list`);
  }

  private async removeHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const courseId = message.text.replace(TEACHER_BOT_COMMANDS.REMOVE.command, '').trim();
    await this.mongoCourseService.removeCourse(courseId);
    await this.bot.sendMessage(chatId, 'OK, I removed that course');
  }

  async messageHandler(message: Message) {
    const { chatId, text, audio } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(TEACHER_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    this.logger.log(`${this.messageHandler.name} - chatId: ${chatId} - start`);

    try {
      const activeCourse = await this.mongoCourseService.getActiveCourse();
      if (!activeCourse) {
        await this.bot.sendMessage(
          chatId,
          `I see you dont have an active course\nIf you want to start a new one, just use the ${TEACHER_BOT_COMMANDS.COURSE.command} command`,
        );
        return;
      }

      let question = text;
      if (audio) {
        const { audioFileLocalPath } = await downloadAudioFromVideoOrAudio(
          this.bot,
          {
            audio,
            video: null,
          },
          LOCAL_FILES_PATH,
        );
        question = await this.aiService.getTranscriptFromAudio(audioFileLocalPath);
        await deleteFile(audioFileLocalPath);
      }

      await this.teacherService.processQuestion(chatId, question);
      this.logger.log(`${this.messageHandler.name} - chatId: ${chatId} - success`);
    } catch (err) {
      this.logger.error(`${this.messageHandler.name} - chatId: ${chatId} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery) {
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
      this.logger.error(`${this.callbackQueryHandler.name} - chatId: ${chatId} - ${logBody} - ${errorMessage}`);
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }

  private async handleCallbackCompleteCourse(chatId: number, courseId: string) {
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
