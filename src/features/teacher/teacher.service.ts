import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { getResponse } from '@services/openai';
import { getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import {
  createCourseParticipation,
  getActiveCourseParticipation,
  getCourse,
  getCourseParticipation,
  getCourseParticipations,
  getRandomCourse,
  markCourseParticipationLessonCompleted,
  saveCourseSummary,
  saveMessageId,
  saveSummarySent,
  updatePreviousResponseId,
} from './mongo';
import { BOT_ACTIONS, BOT_CONFIG, SUMMARY_PROMPT, SYSTEM_PROMPT, THREAD_MESSAGE_FIRST_LESSON, THREAD_MESSAGE_NEXT_LESSON, TOTAL_COURSE_LESSONS } from './teacher.config';
import { Course, CourseParticipation } from './types';
import { CourseResponseSchema, CourseSummarySchema } from './types';
import { generateSummaryMessage } from './utils';

const getBotInlineKeyboardMarkup = (courseParticipation: CourseParticipation, isLesson: boolean) => {
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
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async handleCourseReminders(courseParticipation: CourseParticipation) {
    await this.bot.sendMessage(courseParticipation.chatId, generateSummaryMessage(courseParticipation.summaryDetails));
    await saveSummarySent(courseParticipation._id.toString());
  }

  async processCourseFirstLesson(chatId: number): Promise<void> {
    const courseParticipation = await getActiveCourseParticipation(chatId);
    if (courseParticipation) {
      return;
    }

    await this.startNewCourse(chatId, false);
  }

  async processCourseNextLesson(chatId: number): Promise<void> {
    try {
      await this.processLesson(chatId, true);
    } catch (err) {
      this.logger.error(`${this.processCourseNextLesson.name} - error: ${err}`);
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', error: `${err}` });
    }
  }

  async startNewCourse(chatId: number, onDemand: boolean): Promise<void> {
    const { course, courseParticipation } = await this.getNewCourse(chatId);
    if (!course || !courseParticipation) {
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', chatId, error: 'No new courses found' });
      if (onDemand) {
        await this.bot.sendMessage(chatId, `I see no courses available for You. Please try again later or contact us.`);
      }
      return;
    }
    await this.bot.sendMessage(chatId, `Course started: ${course.topic}`);
    await this.processCourseLesson(chatId, courseParticipation, `${THREAD_MESSAGE_FIRST_LESSON}. this course's topic is ${course.topic}`);
  }

  async getNewCourse(chatId: number): Promise<{ course: Course; courseParticipation: CourseParticipation }> {
    const courseParticipations = await getCourseParticipations(chatId);
    const coursesParticipated = courseParticipations.map((courseParticipation) => courseParticipation.courseId);

    const course = await getRandomCourse(chatId, coursesParticipated);
    if (!course) {
      return { course: null, courseParticipation: null };
    }
    const courseParticipation = await createCourseParticipation(chatId, course._id.toString());
    return { course, courseParticipation };
  }

  async processLesson(chatId: number, isScheduled = false): Promise<void> {
    const courseParticipation = await getActiveCourseParticipation(chatId);
    if (!courseParticipation) {
      !isScheduled && (await this.bot.sendMessage(chatId, `I see no active course. You can always start a new one.`));
      return;
    }

    if (courseParticipation.lessonsCompleted >= TOTAL_COURSE_LESSONS) {
      !isScheduled && (await this.bot.sendMessage(chatId, `You completed all this course's lessons, but You can still ask questions.`));
      return;
    }

    await this.processCourseLesson(chatId, courseParticipation, THREAD_MESSAGE_NEXT_LESSON);
  }

  async processCourseLesson(chatId: number, courseParticipation: CourseParticipation, prompt: string): Promise<void> {
    if (!courseParticipation) {
      return;
    }
    await this.processQuestion(chatId, courseParticipation, prompt);
    await markCourseParticipationLessonCompleted(courseParticipation._id);
  }

  async processQuestion(chatId: number, courseParticipation: CourseParticipation, question: string): Promise<void> {
    const { id: responseId, result } = await getResponse<typeof CourseResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: question,
      schema: CourseResponseSchema,
    });
    await updatePreviousResponseId(courseParticipation._id.toString(), responseId);
    const { message_id: messageId } = await sendStyledMessage(this.bot, chatId, result.text, 'Markdown', getBotInlineKeyboardMarkup(courseParticipation, false));
    saveMessageId(courseParticipation._id.toString(), messageId);
  }

  async generateCourseSummary(courseParticipationId: string): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    const course = await getCourse(courseParticipation.courseId);
    if (!course) {
      return;
    }

    const { result: summaryDetails } = await getResponse({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: SUMMARY_PROMPT,
      schema: CourseSummarySchema,
    });

    await saveCourseSummary(courseParticipation, course.topic, { summary: summaryDetails.summary, keyTakeaways: summaryDetails.keyTakeaways });
  }
}
