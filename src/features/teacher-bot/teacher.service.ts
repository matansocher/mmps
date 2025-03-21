import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CourseModel, CourseParticipationModel, TeacherMongoCourseParticipationService, TeacherMongoCourseService, TeacherMongoUserPreferencesService } from '@core/mongo/teacher-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, TEACHER_ASSISTANT_ID, THREAD_MESSAGE_FIRST_LESSON, THREAD_MESSAGE_NEXT_LESSON, TOTAL_COURSE_LESSONS } from './teacher-bot.config';

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly mongoCourseParticipationService: TeacherMongoCourseParticipationService,
    private readonly mongoUserPreferencesService: TeacherMongoUserPreferencesService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierBotService,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly bot: TelegramBot,
  ) {}

  async processCourseFirstLesson(chatId: number): Promise<void> {
    const activeCourseParticipation = await this.mongoCourseParticipationService.getActiveCourseParticipation(chatId);
    if (activeCourseParticipation) {
      if (activeCourseParticipation.assignedAt.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        await this.bot.sendMessage(chatId, `It has been too long since you last studied. Let me know if you want to start a new course 😁`);
      }
      return;
    }

    await this.startNewCourse(chatId);
  }

  async processCourseNextLesson(chatId: number): Promise<void> {
    try {
      await this.processLesson(chatId, true);
    } catch (err) {
      this.logger.error(`${this.processCourseNextLesson.name} - error: ${err}`);
      this.notifier.notify(BOTS.PROGRAMMING_TEACHER, { action: 'ERROR', error: `${err}` });
    }
  }

  async startNewCourse(chatId: number): Promise<void> {
    const { course, courseParticipation } = await this.getNewCourse(chatId);
    await this.processCourseLesson(chatId, courseParticipation, courseParticipation.threadId, `${THREAD_MESSAGE_FIRST_LESSON}. this course's topic is ${course.topic}`);
  }

  async getNewCourse(chatId: number): Promise<{ course: CourseModel; courseParticipation: CourseParticipationModel }> {
    const courseParticipations = await this.mongoCourseParticipationService.getCourseParticipations(chatId);
    const coursesParticipated = courseParticipations.map((courseParticipation) => courseParticipation.courseId);

    const course = await this.mongoCourseService.getRandomCourse(chatId, coursesParticipated);
    if (!course) {
      this.notifier.notify(BOTS.PROGRAMMING_TEACHER, { action: 'ERROR', error: 'No new courses found' });
      return null;
    }
    const { id: threadId } = await this.openaiAssistantService.createThread();
    const courseParticipation = await this.mongoCourseParticipationService.createCourseParticipation(chatId, course._id.toString());
    courseParticipation.threadId = threadId;
    await this.mongoCourseParticipationService.startCourseParticipation(courseParticipation?._id, { threadId });
    await sendStyledMessage(this.bot, chatId, `Course started: \`${course.topic}\``);
    return { course, courseParticipation };
  }

  async processLesson(chatId: number, isScheduled = false): Promise<void> {
    const activeCourseParticipation = await this.mongoCourseParticipationService.getActiveCourseParticipation(chatId);
    if (!activeCourseParticipation) {
      !isScheduled && (await this.bot.sendMessage(chatId, `I see no active course. You can always start a new one.`));
      return;
    }

    if (activeCourseParticipation.lessonsCompleted >= TOTAL_COURSE_LESSONS) {
      !isScheduled && (await this.bot.sendMessage(chatId, `You completed all this course's lessons, but You can still ask questions.`));
      return;
    }

    await this.processCourseLesson(chatId, activeCourseParticipation, activeCourseParticipation.threadId, THREAD_MESSAGE_NEXT_LESSON);
  }

  async processCourseLesson(chatId: number, courseParticipation: CourseParticipationModel, threadId: string, prompt: string): Promise<void> {
    if (!courseParticipation) {
      return;
    }
    const response = await this.getAssistantAnswer(threadId, prompt);

    // const isLastLesson = courseParticipation.lessonsCompleted === TOTAL_COURSE_LESSONS - 1;
    const inlineKeyboardButtons = [
      {
        text: '✅ Complete Course ✅',
        callback_data: `${courseParticipation._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendStyledMessage(this.bot, chatId, response, 'Markdown', inlineKeyboardMarkup);
    await this.mongoCourseParticipationService.markCourseParticipationLessonCompleted(courseParticipation._id);
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async processQuestion(chatId: number, question: string, activeParticipationCourse: CourseParticipationModel): Promise<void> {
    const response = await this.getAssistantAnswer(activeParticipationCourse.threadId, question);
    const inlineKeyboardButtons = [
      {
        text: '✅ Complete Course ✅',
        callback_data: `${activeParticipationCourse._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendStyledMessage(this.bot, chatId, response, 'Markdown', inlineKeyboardMarkup);
  }
}
