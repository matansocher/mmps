import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CourseModel, CourseParticipationModel, TeacherMongoCourseParticipationService, TeacherMongoCourseService } from '@core/mongo/teacher-mongo';
import { NotifierService } from '@core/notifier';
import { OpenaiAssistantService } from '@services/openai';
import { getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, TEACHER_ASSISTANT_ID, THREAD_MESSAGE_FIRST_LESSON, THREAD_MESSAGE_NEXT_LESSON, TOTAL_COURSE_LESSONS } from './teacher.config';

const getBotInlineKeyboardMarkup = (courseParticipation: CourseParticipationModel, isLesson: boolean) => {
  let isCourseLessonsCompleted = courseParticipation.lessonsCompleted >= TOTAL_COURSE_LESSONS - 1; // minus 1 since the lesson is marked completed only after sending the user the message
  if (!isLesson) {
    isCourseLessonsCompleted = courseParticipation.lessonsCompleted >= TOTAL_COURSE_LESSONS;
  }
  const inlineKeyboardButtons = [
    {
      text: '🎧 Transcribe 🎧',
      callback_data: `${BOT_ACTIONS.TRANSCRIBE} - ${courseParticipation._id}`,
    },
    !isCourseLessonsCompleted
      ? {
          text: '➡️ Next Lesson ➡️',
          callback_data: `${BOT_ACTIONS.NEXT_LESSON}`,
        }
      : null,
    {
      text: '✅ Complete Course ✅',
      callback_data: `${BOT_ACTIONS.COMPLETE} - ${courseParticipation._id}`,
    },
  ].filter(Boolean);
  return getInlineKeyboardMarkup(inlineKeyboardButtons);
};

@Injectable()
export class TeacherService {
  private readonly logger = new Logger(TeacherService.name);

  constructor(
    private readonly courseDB: TeacherMongoCourseService,
    private readonly courseParticipationDB: TeacherMongoCourseParticipationService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async processCourseFirstLesson(chatId: number): Promise<void> {
    const activeCourseParticipation = await this.courseParticipationDB.getActiveCourseParticipation(chatId);
    if (activeCourseParticipation) {
      return;
    }

    await this.startNewCourse(chatId);
  }

  async processCourseNextLesson(chatId: number): Promise<void> {
    try {
      await this.processLesson(chatId, true);
    } catch (err) {
      this.logger.error(`${this.processCourseNextLesson.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }

  async startNewCourse(chatId: number): Promise<void> {
    const { course, courseParticipation } = await this.getNewCourse(chatId);
    await this.bot.sendMessage(chatId, `Course started: ${course.topic}`);
    await this.processCourseLesson(chatId, courseParticipation, courseParticipation.threadId, `${THREAD_MESSAGE_FIRST_LESSON}. this course's topic is ${course.topic}`);
  }

  async getNewCourse(chatId: number): Promise<{ course: CourseModel; courseParticipation: CourseParticipationModel }> {
    const courseParticipations = await this.courseParticipationDB.getCourseParticipations(chatId);
    const coursesParticipated = courseParticipations.map((courseParticipation) => courseParticipation.courseId);

    const course = await this.courseDB.getRandomCourse(chatId, coursesParticipated);
    if (!course) {
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: 'No new courses found' });
      return null;
    }
    const { id: threadId } = await this.openaiAssistantService.createThread();
    const courseParticipation = await this.courseParticipationDB.createCourseParticipation(chatId, course._id.toString(), threadId);
    courseParticipation.threadId = threadId;
    return { course, courseParticipation };
  }

  async processLesson(chatId: number, isScheduled = false): Promise<void> {
    const activeCourseParticipation = await this.courseParticipationDB.getActiveCourseParticipation(chatId);
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
    const response = await this.openaiAssistantService.getAssistantAnswer(TEACHER_ASSISTANT_ID, threadId, prompt);
    await sendStyledMessage(this.bot, chatId, response, 'Markdown', getBotInlineKeyboardMarkup(courseParticipation, true));
    await this.courseParticipationDB.markCourseParticipationLessonCompleted(courseParticipation._id);
  }

  async processQuestion(chatId: number, question: string, activeCourseParticipation: CourseParticipationModel): Promise<void> {
    const response = await this.openaiAssistantService.getAssistantAnswer(TEACHER_ASSISTANT_ID, activeCourseParticipation.threadId, question);
    await sendStyledMessage(this.bot, chatId, response, 'Markdown', getBotInlineKeyboardMarkup(activeCourseParticipation, false));
  }
}
