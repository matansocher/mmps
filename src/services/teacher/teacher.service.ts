import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { CourseModel, TeacherMongoCourseService } from '@core/mongo/teacher-mongo';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { TEACHER_ASSISTANT_ID, THREAD_MESSAGE_FIRST_LESSON, THREAD_MESSAGE_NEXT_LESSON, TOTAL_COURSE_LESSONS } from './teacher.config';

@Injectable()
export class TeacherService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  async startNewCourse(): Promise<void> {
    await this.mongoCourseService.markActiveCourseCompleted();
    const course = await this.getNewCourse();
    await this.processCourseLesson(course, course.threadId, `${THREAD_MESSAGE_FIRST_LESSON}. this course's topic is ${course.topic}`);
  }

  async getNewCourse(): Promise<CourseModel> {
    const course = await this.mongoCourseService.getRandomCourse();
    if (!course) {
      return null;
    }
    const { id: threadId } = await this.openaiAssistantService.createThread();
    course.threadId = threadId;
    await this.mongoCourseService.startCourse(course?._id, { threadId: threadId });
    await this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `Course started: ${course.topic}`);
    return course;
  }

  async processLesson(isScheduled = false): Promise<void> {
    const activeCourse = await this.mongoCourseService.getActiveCourse();
    if (!activeCourse) {
      if (!isScheduled) {
        await this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `I see no active course. You can always start a new one.`);
      }
      return;
    }

    if (activeCourse.lessonsCompleted >= TOTAL_COURSE_LESSONS) {
      if (!isScheduled) {
        await this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `You completed ${activeCourse.topic} course. You can still ask questions.`);
      }
      return;
    }

    await this.processCourseLesson(activeCourse, activeCourse.threadId, THREAD_MESSAGE_NEXT_LESSON);
  }

  async processCourseLesson(course: CourseModel, threadId: string, prompt: string): Promise<void> {
    if (!course) {
      return;
    }
    const response = await this.getAssistantAnswer(threadId, prompt);
    await this.sendMarkdownMessage(MY_USER_ID, response);
    await this.mongoCourseService.markCourseLessonCompleted(course._id);
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async sendMarkdownMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, message, { parse_mode: 'Markdown' });
    } catch (err) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, message);
    }
  }

  async processQuestion(chatId: number, question: string): Promise<void> {
    const activeCourse = await this.mongoCourseService.getActiveCourse();
    if (!activeCourse) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, 'No active course');
    }
    const response = await this.getAssistantAnswer(activeCourse.threadId, question);
    await this.sendMarkdownMessage(MY_USER_ID, response);
  }

  async addCourse(course: string): Promise<void> {
    await this.mongoCourseService.addCourse(course);
  }
}
