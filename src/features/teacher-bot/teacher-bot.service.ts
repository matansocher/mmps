import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CourseParticipationStatus, TeacherMongoCourseParticipationService, TeacherMongoCourseService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { shuffleArray } from '@core/utils';
import { BOTS, getCallbackQueryData, getMessageData, MessageLoader, sendStyledMessage, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { BOT_ACTIONS, NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW, TEACHER_BOT_COMMANDS } from './teacher-bot.config';
import { TeacherService } from './teacher.service';

@Injectable()
export class TeacherBotService implements OnModuleInit {
  private readonly logger = new Logger(TeacherBotService.name);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly mongoCourseParticipationService: TeacherMongoCourseParticipationService,
    private readonly mongoUserPreferencesService: TeacherMongoUserPreferencesService,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(TEACHER_BOT_COMMANDS));

    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, STOP, COURSE, LESSON, LIST, ADD } = TEACHER_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: STOP.command, handler: (message) => this.stopHandler.call(this, message) },
      { event: COMMAND, regex: COURSE.command, handler: (message) => this.courseHandler.call(this, message) },
      { event: COMMAND, regex: LESSON.command, handler: (message) => this.lessonHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: COMMAND, regex: ADD.command, handler: (message) => this.addHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    const replyText = [
      `Hey There 👋`,
      `I am here to teach you all you need about any subject you want.`,
      `I will send you daily lessons of stuff I collect on the internet and summarize it for you in a great way that you can learn from. 😁`,
      `You can always add a course topic by sending me the topic on this format - /add <course topic>, example: /add JavaScript Heap`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async stopHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
    const replyText = [
      'OK, I will stop teaching you for now 🛑',
      `Whenever you are ready, just send me the ${TEACHER_BOT_COMMANDS.START.command} command and we will continue learning`,
      `Another option for you is to start courses manually with the ${TEACHER_BOT_COMMANDS.COURSE.command} command and another lesson with the ${TEACHER_BOT_COMMANDS.LESSON.command} command`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async courseHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const activeCourse = await this.mongoCourseParticipationService.getActiveCourseParticipation(chatId);
    if (activeCourse?._id) {
      await this.mongoCourseParticipationService.markCourseParticipationLessonCompleted(activeCourse?._id);
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '👨‍🏫' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.startNewCourse(chatId);
    });
  }

  private async lessonHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '👨‍🏫' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.processLesson(chatId, false);
    });
  }

  private async listHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const [courses, courseParticipations] = await Promise.all([this.mongoCourseService.getAllCourses(), this.mongoCourseParticipationService.getCourseParticipations(chatId)]);
    const coursesParticipated = courseParticipations?.map((courseParticipation) => courseParticipation.courseId);
    let coursesNotParticipated = courses?.filter((course) => !coursesParticipated.includes(course._id.toString()));

    if (!coursesNotParticipated?.length) {
      await this.bot.sendMessage(chatId, 'I see you dont have any unfinished courses\nYou can add one with the /add <course topic>, example: /add JavaScript Heap');
      return;
    }
    let messagePrefix = 'Available Courses (random order)';
    coursesNotParticipated = shuffleArray(coursesNotParticipated);
    if (coursesNotParticipated.length > NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW) {
      coursesNotParticipated = coursesNotParticipated.slice(0, NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW);
      messagePrefix = `Available Courses (random order) list it too big, showing the random first ${NUMBER_OF_COURSES_LIST_TOO_BIG_TO_SHOW}`;
    }
    const coursesStr = coursesNotParticipated.map(({ topic }) => `👨‍🏫 ${topic}`).join('\n');
    await sendStyledMessage(this.bot, chatId, `${messagePrefix}:\n\n${coursesStr}`);
  }

  private async addHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const courseName = message.text.replace(TEACHER_BOT_COMMANDS.ADD.command, '').trim();
    if (!courseName?.length) {
      await this.bot.sendMessage(chatId, `Please add the course name after the add command.\n example: /add JavaScript Heap`);
      return;
    }
    await this.mongoCourseService.createCourse(chatId, courseName);
    await this.bot.sendMessage(chatId, `OK, I added \`${courseName}\` to your courses list`);
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(TEACHER_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const activeCourseParticipation = await this.mongoCourseParticipationService.getActiveCourseParticipation(chatId);
    if (!activeCourseParticipation) {
      await this.bot.sendMessage(chatId, `I see you dont have an active course\nIf you want to start a new one, just use the ${TEACHER_BOT_COMMANDS.COURSE.command} command`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '👨‍🏫' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.processQuestion(chatId, text, activeCourseParticipation);
    });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [courseParticipationId, action] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.COMPLETE:
        await this.handleCallbackCompleteCourse(chatId, messageId, courseParticipationId);
        break;
      default:
        throw new Error('Invalid action');
    }
  }

  private async handleCallbackCompleteCourse(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    const course = await this.mongoCourseParticipationService.getCourseParticipation(courseParticipationId);
    if (!course) {
      await this.bot.sendMessage(chatId, `I am sorry but I couldn't find that course`);
      return;
    }

    if (course.status === CourseParticipationStatus.Completed) {
      await this.bot.sendMessage(chatId, 'It looks like you already completed that course');
      return;
    }

    await this.mongoCourseParticipationService.markCourseParticipationCompleted(courseParticipationId);
    await this.bot.sendMessage(chatId, '👏');
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
  }
}
