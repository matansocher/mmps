import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { generateEmbedding, getResponse } from '@services/openai';
import { queryVectors } from '@services/pinecone';
import { getInlineKeyboardMarkup, sendStyledMessage } from '@services/telegram';
import {
  createCourseParticipation,
  getActiveCourseParticipation,
  getCourse,
  getCourseParticipation,
  getCourseParticipations,
  getRandomCourse,
  markLessonCompleted,
  markLessonSent,
  saveCourseSummary,
  saveMessageId,
  saveSummarySent,
  updatePreviousResponseId,
} from './mongo';
import { BOT_ACTIONS, BOT_CONFIG, LESSON_PROMPT_TEMPLATE, SUMMARY_PROMPT, SYSTEM_PROMPT } from './scholar.config';
import { Course, CourseParticipation, CourseSummarySchema, LessonResponseSchema } from './types';
import { formatLessonProgress, generateSummaryMessage } from './utils';

const PINECONE_INDEX_NAME = 'scholar-materials';

const getBotInlineKeyboardMarkup = (courseParticipation: CourseParticipation) => {
  const isLastLesson = courseParticipation.currentLesson >= courseParticipation.totalLessons;

  const inlineKeyboardButtons = [
    {
      text: '🎧 Transcribe 🎧',
      callback_data: `${BOT_ACTIONS.TRANSCRIBE} - ${courseParticipation._id}`,
    },
    {
      text: '✅ Complete Lesson ✅',
      callback_data: `${BOT_ACTIONS.COMPLETE_LESSON} - ${courseParticipation._id}`,
    },
    isLastLesson
      ? {
          text: '🎓 Complete Course 🎓',
          callback_data: `${BOT_ACTIONS.COMPLETE_COURSE} - ${courseParticipation._id}`,
        }
      : null,
  ].filter(Boolean);

  return getInlineKeyboardMarkup(inlineKeyboardButtons);
};

@Injectable()
export class ScholarService {
  private readonly logger = new Logger(ScholarService.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  async handleCourseReminders(courseParticipation: CourseParticipation) {
    await this.bot.sendMessage(courseParticipation.chatId, generateSummaryMessage(courseParticipation.summaryDetails));
    await saveSummarySent(courseParticipation._id.toString());
  }

  async startNewCourse(chatId: number, onDemand: boolean): Promise<void> {
    const { course, courseParticipation } = await this.getNewCourse();
    if (!course || !courseParticipation) {
      this.logger.error('No new courses found');
      if (onDemand) {
        await this.bot.sendMessage(chatId, `I see no courses available. Please upload some materials first.`);
      }
      return;
    }

    const welcomeMessage = [
      `📚 *Starting Course: ${course.topic}*`,
      ``,
      `📖 This course has *${course.totalLessons} lessons*`,
      `⏰ Complete each lesson to unlock the next one`,
      `💡 ${course.materialSummary}`,
      ``,
      `Let's begin! 🚀`,
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });

    await this.sendLesson(chatId, courseParticipation, course);
  }

  async getNewCourse(): Promise<{ course: Course; courseParticipation: CourseParticipation }> {
    const courseParticipations = await getCourseParticipations();
    const coursesParticipated = courseParticipations.map((cp) => cp.courseId);

    const course = await getRandomCourse(coursesParticipated);
    if (!course) {
      return { course: null, courseParticipation: null };
    }

    const courseParticipation = await createCourseParticipation(MY_USER_ID, course._id.toString(), course.totalLessons);
    return { course, courseParticipation };
  }

  async processNextLesson(chatId: number): Promise<void> {
    const courseParticipation = await getActiveCourseParticipation(MY_USER_ID);
    if (!courseParticipation) {
      await this.bot.sendMessage(chatId, `I see no active course. You can always start a new one with /course.`);
      return;
    }

    if (courseParticipation.lessonsCompleted < courseParticipation.currentLesson - 1) {
      await this.bot.sendMessage(
        chatId,
        `Please complete your current lesson (Lesson ${courseParticipation.currentLesson - 1}) before moving to the next one. Click "✅ Complete Lesson" when you're done!`,
      );
      return;
    }

    if (courseParticipation.currentLesson > courseParticipation.totalLessons) {
      await this.bot.sendMessage(chatId, `🎉 You've completed all lessons! Use the "🎓 Complete Course" button to finish and get your summary.`);
      return;
    }

    const course = await getCourse(courseParticipation.courseId);
    await this.sendLesson(chatId, courseParticipation, course);
  }

  async sendLesson(chatId: number, courseParticipation: CourseParticipation, course: Course): Promise<void> {
    const lessonNumber = courseParticipation.currentLesson;

    const lessonOutline = course.lessonOutlines?.find((outline) => outline.lessonNumber === lessonNumber);

    let matches;
    if (lessonOutline?.suggestedChunkIndexes?.length) {
      // Use pre-planned chunks for this lesson
      const query = `Lesson ${lessonNumber}: ${lessonOutline.topics.join(', ')}`;
      const embedding = await generateEmbedding(query);
      matches = await queryVectors(PINECONE_INDEX_NAME, embedding, 10, {
        courseId: { $eq: course._id.toString() },
        chunkIndex: { $in: lessonOutline.suggestedChunkIndexes },
      });
    } else {
      // Fallback: query without pre-planning
      const query = `Lesson ${lessonNumber} of ${courseParticipation.totalLessons} on ${course.topic}`;
      const embedding = await generateEmbedding(query);
      matches = await queryVectors(PINECONE_INDEX_NAME, embedding, 5, { courseId: { $eq: course._id.toString() } });
    }

    const relevantMaterials = matches.map((match) => ({
      summary: (match.metadata?.summary as string) || (match.metadata?.content as string)?.substring(0, 500),
      chunkIndex: match.metadata?.chunkIndex as number,
      score: match.score,
    }));

    const materialContext = relevantMaterials.map((m, i) => `[Source ${i + 1}]:\n${m.summary}`).join('\n\n---\n\n');

    const previousLessonsContext =
      lessonNumber > 1
        ? `This is lesson ${lessonNumber} of ${courseParticipation.totalLessons}. The user has completed ${lessonNumber - 1} previous lesson(s). Build on the concepts and knowledge from previous lessons. Reference specific topics from earlier lessons when relevant to create continuity.`
        : `This is the first lesson of ${courseParticipation.totalLessons}. Start with foundational concepts and set the stage for the upcoming lessons.`;

    const lessonPrompt = LESSON_PROMPT_TEMPLATE.replace('{lessonNumber}', lessonNumber.toString())
      .replace('{totalLessons}', courseParticipation.totalLessons.toString())
      .replace('{topic}', course.topic)
      .replace('{previousLessonsContext}', previousLessonsContext)
      .replace('{materialContext}', materialContext);

    const { id: responseId, result } = await getResponse<typeof LessonResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: lessonPrompt,
      schema: LessonResponseSchema,
      store: true,
    });

    await updatePreviousResponseId(courseParticipation._id.toString(), responseId);

    const progressText = formatLessonProgress(courseParticipation.currentLesson, courseParticipation.totalLessons, courseParticipation.lessonsCompleted);

    const fullMessage = `${progressText}\n\n${result.text}`;

    const { message_id: messageId } = await sendStyledMessage(this.bot, chatId, fullMessage, 'Markdown', getBotInlineKeyboardMarkup(courseParticipation));

    await saveMessageId(courseParticipation._id.toString(), messageId);
    await markLessonSent(courseParticipation._id.toString());

    this.logger.log(`Sent lesson ${lessonNumber}/${courseParticipation.totalLessons} to chat ${chatId}`);
  }

  async handleLessonCompletion(chatId: number, courseParticipationId: string): Promise<void> {
    const courseParticipation = await markLessonCompleted(courseParticipationId);
    const isLastLesson = courseParticipation.lessonsCompleted >= courseParticipation.totalLessons;

    if (isLastLesson) {
      await this.bot.sendMessage(chatId, `✅ Final lesson completed! 🎉\n\nClick "🎓 Complete Course" to finish and receive your comprehensive summary.`);
    } else {
      await this.bot.sendMessage(
        chatId,
        [
          `✅ Lesson ${courseParticipation.lessonsCompleted}/${courseParticipation.totalLessons} completed!`,
          ``,
          `Your next lesson will be delivered at the next scheduled time.`,
          ``,
          `Or use /next to continue immediately.`,
        ].join('\n'),
        { parse_mode: 'Markdown' },
      );
    }
  }

  async processQuestion(chatId: number, courseParticipation: CourseParticipation, question: string): Promise<void> {
    const course = await getCourse(courseParticipation.courseId);

    const embedding = await generateEmbedding(question);
    const matches = await queryVectors(PINECONE_INDEX_NAME, embedding, 3, { courseId: { $eq: course._id.toString() } });
    const relevantMaterials = matches.map((match) => ({
      summary: (match.metadata?.summary as string) || (match.metadata?.content as string)?.substring(0, 500),
      chunkIndex: match.metadata?.chunkIndex as number,
    }));

    const materialContext = relevantMaterials.map((m, i) => `[Source ${i + 1}]:\n${m.summary}`).join('\n\n---\n\n');

    const enhancedQuestion = `
User question: ${question}

Relevant course materials:
${materialContext}

Please answer the question based on the course materials and your expertise. If the materials don't contain enough information, use your knowledge but indicate this to the user.
`;

    const { id: responseId, result } = await getResponse<typeof LessonResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: enhancedQuestion,
      schema: LessonResponseSchema,
      store: true,
    });

    await updatePreviousResponseId(courseParticipation._id.toString(), responseId);

    const { message_id: messageId } = await sendStyledMessage(this.bot, chatId, result.text, 'Markdown', getBotInlineKeyboardMarkup(courseParticipation));

    await saveMessageId(courseParticipation._id.toString(), messageId);
  }

  async generateCourseSummary(courseParticipationId: string): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    const course = await getCourse(courseParticipation.courseId);
    if (!course) {
      return;
    }

    const { result: summaryDetails } = await getResponse<typeof CourseSummarySchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: SUMMARY_PROMPT,
      schema: CourseSummarySchema,
      store: true,
    });

    await saveCourseSummary(courseParticipation, course.topic, {
      summary: summaryDetails.summary,
      keyTakeaways: summaryDetails.keyTakeaways,
      practicalApplications: summaryDetails.practicalApplications,
      nextSteps: summaryDetails.nextSteps,
    });
  }
}
