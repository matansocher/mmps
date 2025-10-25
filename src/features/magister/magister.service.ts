import { Injectable, Logger } from '@nestjs/common';
import { generateEmbedding, getResponse } from '@services/openai';
import { queryVectors } from '@services/pinecone';
import { getInlineKeyboardMarkup, provideTelegramBot, sendStyledMessage } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, LESSON_PROMPT_TEMPLATE, PINECONE_INDEX_NAME, QUIZ_PROMPT, SUMMARY_PROMPT, SYSTEM_PROMPT } from './magister.config';
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
  saveQuizAnswer,
  saveQuizQuestions,
  saveSummarySent,
  updatePreviousResponseId,
  updateQuizScore,
} from './mongo';
import { Course, CourseParticipation, CourseSummarySchema, LessonResponseSchema, QuizAnswer, QuizSchema } from './types';
import { formatLessonProgress, generateSummaryMessage, getScoreMessage } from './utils';

const getBotInlineKeyboardMarkup = (courseParticipation: CourseParticipation) => {
  const isLastLesson = courseParticipation.currentLesson >= courseParticipation.totalLessons;

  const inlineKeyboardButtons = [
    {
      text: '🎧 Transcribe 🎧',
      callback_data: [BOT_ACTIONS.TRANSCRIBE, courseParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
    },
    ...(isLastLesson
      ? [
          {
            text: '🎯 Take Quiz 🎯',
            callback_data: [BOT_ACTIONS.QUIZ, courseParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
          },
          {
            text: '🎓 Complete Course 🎓',
            callback_data: [BOT_ACTIONS.COMPLETE_COURSE, courseParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
          },
        ]
      : [
          {
            text: '✅ Complete Lesson ✅',
            callback_data: [BOT_ACTIONS.COMPLETE_LESSON, courseParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
          },
        ]),
  ];

  return getInlineKeyboardMarkup(inlineKeyboardButtons);
};

@Injectable()
export class MagisterService {
  private readonly logger = new Logger(MagisterService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  async handleCourseReminders(courseParticipation: CourseParticipation) {
    await this.bot.sendMessage(courseParticipation.chatId, generateSummaryMessage(courseParticipation.summaryDetails));
    await saveSummarySent(courseParticipation._id.toString());
  }

  async startNewCourse(chatId: number, onDemand: boolean): Promise<{ course: Course; courseParticipation: CourseParticipation } | null> {
    const { course, courseParticipation } = await this.getNewCourse(chatId);
    if (!course || !courseParticipation) {
      this.logger.error('No new courses found');
      if (onDemand) {
        await this.bot.sendMessage(chatId, `I see no courses available. Please upload some materials first.`);
      }
      return null;
    }

    const welcomeMessage = [
      `📚 *Starting Course: ${course.topic}*`,
      ``,
      `📖 This course has *${course.totalLessons} lessons*`,
      `⏰ Complete each lesson to unlock the next one`,
      ``,
      `Let's begin! 🚀`,
    ].join('\n');

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });

    return { course, courseParticipation };
  }

  async getNewCourse(chatId: number): Promise<{ course: Course; courseParticipation: CourseParticipation }> {
    const courseParticipations = await getCourseParticipations();
    const coursesParticipated = courseParticipations.map((cp) => cp.courseId);

    const course = await getRandomCourse(coursesParticipated);
    if (!course) {
      return { course: null, courseParticipation: null };
    }

    const courseParticipation = await createCourseParticipation(chatId, course._id.toString(), course.totalLessons);
    return { course, courseParticipation };
  }

  async processNextLesson(chatId: number): Promise<void> {
    const courseParticipation = await getActiveCourseParticipation(chatId);
    if (!courseParticipation) {
      await this.bot.sendMessage(chatId, `I see no active course. You can always start a new one with /course.`);
      return;
    }

    // Check if user needs to complete previous lesson first
    // currentLesson is always 1 ahead after markLessonSent
    // So if currentLesson=2 and lessonsCompleted=0, user needs to complete lesson 1 first
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

    let matches: Awaited<ReturnType<typeof queryVectors>>;
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

    const materialContext = relevantMaterials.map((m, i: number) => `[Source ${i + 1}]:\n${m.summary}`).join('\n\n---\n\n');

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

    const progressText = formatLessonProgress(courseParticipation.currentLesson, courseParticipation.totalLessons);

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
          `Your next lesson will be delivered at the next scheduled time.`,
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

  async generateQuiz(courseParticipationId: string): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    if (!courseParticipation) {
      return;
    }

    const { result: quizData } = await getResponse<typeof QuizSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: courseParticipation.previousResponseId,
      input: QUIZ_PROMPT,
      schema: QuizSchema,
      store: true,
    });

    await saveQuizQuestions(courseParticipationId, quizData.questions);
  }

  async sendQuizQuestion(chatId: number, courseParticipation: CourseParticipation, questionIndex: number): Promise<void> {
    if (!courseParticipation.quizDetails || questionIndex >= courseParticipation.quizDetails.questions.length) {
      return;
    }

    const question = courseParticipation.quizDetails.questions[questionIndex];
    const questionNumber = questionIndex + 1;
    const totalQuestions = courseParticipation.quizDetails.questions.length;

    const questionText = [`*Question ${questionNumber} of ${totalQuestions}:*`, '', question.question].join('\n');

    const buttonLayout = question.options.map((option, index) => [
      {
        text: option,
        callback_data: [BOT_ACTIONS.QUIZ_ANSWER, courseParticipation._id, questionIndex, index].join(INLINE_KEYBOARD_SEPARATOR),
      },
    ]);

    await this.bot.sendMessage(chatId, questionText, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttonLayout } });
  }

  async checkQuizAnswer(courseParticipationId: string, questionIndex: number, userAnswerIndex: number, chatId: number, messageId: number): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    if (!courseParticipation?.quizDetails) {
      return;
    }

    const question = courseParticipation.quizDetails.questions[questionIndex];
    const isCorrect = userAnswerIndex === question.correctAnswer;

    const answer: QuizAnswer = { questionIndex, userAnswer: userAnswerIndex, isCorrect, answeredAt: new Date() };
    await saveQuizAnswer(courseParticipationId, answer);

    await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }).catch(() => {});

    if (isCorrect) {
      await this.bot.sendMessage(chatId, `✅ Correct! Well done! 🎉`);
    } else {
      const correctAnswerText = question.options[question.correctAnswer];
      await this.bot.sendMessage(chatId, [`❌ Not quite...`, '', `The correct answer is: ${correctAnswerText}`, '', `💡 ${question.explanation}`].join('\n'));
    }

    const updatedParticipation = await getCourseParticipation(courseParticipationId);
    const answersCount = updatedParticipation.quizDetails.answers.length;
    const totalQuestions = updatedParticipation.quizDetails.questions.length;

    if (answersCount < totalQuestions) {
      await this.sendQuizQuestion(chatId, updatedParticipation, answersCount);
    } else {
      const correctAnswers = updatedParticipation.quizDetails.answers.filter((a) => a.isCorrect).length;
      await updateQuizScore(courseParticipationId, correctAnswers);

      const scoreMessage = getScoreMessage(correctAnswers, totalQuestions);

      const completeButton = {
        text: '🎓 Complete Course 🎓',
        callback_data: [BOT_ACTIONS.COMPLETE_COURSE, courseParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
      };

      await this.bot.sendMessage(chatId, scoreMessage, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[completeButton]] } });
    }
  }
}
