import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { CourseModel, TeacherMongoCourseService } from '@core/mongo/teacher-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, TEACHER_ASSISTANT_ID, THREAD_MESSAGE_FIRST_LESSON, THREAD_MESSAGE_NEXT_LESSON, TOTAL_COURSE_LESSONS } from './teacher-bot.config';

@Injectable()
export class TeacherService {
  constructor(
    private readonly mongoCourseService: TeacherMongoCourseService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.PROGRAMMING_TEACHER.id) private readonly bot: TelegramBot,
  ) {}

  async startNewCourse(chatId: number): Promise<void> {
    const course = await this.getNewCourse(chatId);
    await this.processCourseLesson(chatId, course, course.threadId, `${THREAD_MESSAGE_FIRST_LESSON}. this course's topic is ${course.topic}`);
  }

  async getNewCourse(chatId: number): Promise<CourseModel> {
    const course = await this.mongoCourseService.getRandomCourse();
    if (!course) {
      this.notifierBotService.notify(
        BOTS.PROGRAMMING_TEACHER,
        {
          action: 'ERROR',
          error: 'No new courses found',
        },
        null,
        null,
      );
      return null;
    }
    const { id: threadId } = await this.openaiAssistantService.createThread();
    course.threadId = threadId;
    await this.mongoCourseService.startCourse(course?._id, { threadId: threadId });
    await sendStyledMessage(this.bot, chatId, `\`Course started: ${course.topic}\``);
    await this.bot.sendMessage(chatId, `Course started: ${course.topic}`);
    return course;
  }

  async processLesson(chatId: number, isScheduled = false): Promise<void> {
    const activeCourse = await this.mongoCourseService.getActiveCourse();
    if (!activeCourse) {
      !isScheduled && (await this.bot.sendMessage(chatId, `I see no active course. You can always start a new one.`));
      return;
    }

    if (activeCourse.lessonsCompleted >= TOTAL_COURSE_LESSONS) {
      !isScheduled && (await this.bot.sendMessage(chatId, `You completed ${activeCourse.topic} course. You can still ask questions.`));
      return;
    }

    await this.processCourseLesson(chatId, activeCourse, activeCourse.threadId, THREAD_MESSAGE_NEXT_LESSON);
  }

  async processCourseLesson(chatId: number, course: CourseModel, threadId: string, prompt: string): Promise<void> {
    if (!course) {
      return;
    }
    const response = await this.getAssistantAnswer(threadId, prompt);

    const isLastLesson = course.lessonsCompleted === TOTAL_COURSE_LESSONS - 1;
    const inlineKeyboardButtons = [
      {
        text: '✅ Complete Course',
        callback_data: `${course._id} - ${BOT_ACTIONS.COMPLETE}`,
      },
    ];
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    await sendStyledMessage(this.bot, chatId, response, 'Markdown', isLastLesson ? inlineKeyboardMarkup : {});
    await this.mongoCourseService.markCourseLessonCompleted(course._id);
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async processQuestion(chatId: number, question: string): Promise<void> {
    const activeCourse = await this.mongoCourseService.getActiveCourse();
    if (!activeCourse) {
      await this.bot.sendMessage(chatId, 'No active course');
      return;
    }
    const response = await this.getAssistantAnswer(activeCourse.threadId, question);
    await sendStyledMessage(this.bot, chatId, response);
  }
}
