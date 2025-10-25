import { Injectable } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { getResponse } from '@services/openai';
import { getInlineKeyboardMarkup, provideTelegramBot, sendShortenedMessage } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, QUIZ_PROMPT, SUMMARY_PROMPT, SYSTEM_PROMPT } from './educator.config';
import {
  createTopicParticipation,
  getActiveTopicParticipation,
  getRandomTopic,
  getTopic,
  getTopicParticipation,
  getTopicParticipations,
  saveMessageId,
  saveQuizAnswer,
  saveQuizQuestions,
  saveSummarySent,
  saveTopicSummary,
  updatePreviousResponseId,
  updateQuizScore,
} from './mongo';
import { QuizAnswer, QuizSchema, Topic, TopicParticipation, TopicResponseSchema, TopicSummarySchema } from './types';
import { generateSummaryMessage, getScoreMessage } from './utils';

const getBotInlineKeyboardMarkup = (topicParticipation: TopicParticipation) => {
  const inlineKeyboardButtons = [
    {
      text: '🎧 הקראה 🎧',
      callback_data: [BOT_ACTIONS.TRANSCRIBE, topicParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
    },
    {
      text: '🎯 בואו נבחן! 🎯',
      callback_data: [BOT_ACTIONS.QUIZ, topicParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
    },
    {
      text: '✅ סיימתי ✅',
      callback_data: [BOT_ACTIONS.COMPLETE, topicParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
    },
  ];
  return getInlineKeyboardMarkup(inlineKeyboardButtons);
};

@Injectable()
export class EducatorService {
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly notifier: NotifierService) {}

  async handleTopicReminders(topicParticipation: TopicParticipation): Promise<void> {
    await this.bot.sendMessage(topicParticipation.chatId, generateSummaryMessage(topicParticipation.summaryDetails));
    await saveSummarySent(topicParticipation._id.toString());
  }

  async processTopic(chatId: number): Promise<void> {
    const topicParticipation = await getActiveTopicParticipation(chatId);
    if (topicParticipation) {
      return;
    }

    await this.startNewTopic(chatId);
  }

  async getNewTopic(chatId: number): Promise<Topic> {
    const topicParticipations = await getTopicParticipations(chatId);
    const topicsParticipated = topicParticipations.map((topic) => topic.topicId);

    return getRandomTopic(chatId, topicsParticipated);
  }

  async startNewTopic(chatId: number): Promise<void> {
    const topic = await this.getNewTopic(chatId);
    if (!topic) {
      this.notifier.notify(BOT_CONFIG, { action: 'ERROR', chatId, error: 'No new topics found' });
      return;
    }

    const topicParticipation = await createTopicParticipation(chatId, topic._id.toString());

    await this.bot.sendMessage(chatId, [`נושא השיעור הבא שלנו:`, topic.title].join('\n'));
    await this.processQuestion(chatId, topicParticipation, [`הנושא של היום הוא`, `${topic.title}`].join(' '));
  }

  async processQuestion(chatId: number, topicParticipation: TopicParticipation, question: string): Promise<void> {
    const { id: responseId, result } = await getResponse<typeof TopicResponseSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: topicParticipation.previousResponseId,
      input: question,
      schema: TopicResponseSchema,
    });
    await updatePreviousResponseId(topicParticipation._id.toString(), responseId);
    const { message_id: messageId } = await sendShortenedMessage(this.bot, chatId, result.text, { ...getBotInlineKeyboardMarkup(topicParticipation) });
    saveMessageId(topicParticipation._id.toString(), messageId);
  }

  async generateTopicSummary(topicParticipationId: string): Promise<void> {
    const topicParticipation = await getTopicParticipation(topicParticipationId);
    const topic = await getTopic(topicParticipation.topicId);
    if (!topic) {
      return;
    }

    const { result: summaryDetails } = await getResponse<typeof TopicSummarySchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: topicParticipation.previousResponseId,
      input: SUMMARY_PROMPT,
      schema: TopicSummarySchema,
    });

    await saveTopicSummary(topicParticipation, topic.title, { summary: summaryDetails.summary, keyTakeaways: summaryDetails.keyTakeaways });
  }

  async generateQuiz(topicParticipationId: string): Promise<void> {
    const topicParticipation = await getTopicParticipation(topicParticipationId);
    if (!topicParticipation) {
      return;
    }

    const { result: quizData } = await getResponse<typeof QuizSchema>({
      instructions: SYSTEM_PROMPT,
      previousResponseId: topicParticipation.previousResponseId,
      input: QUIZ_PROMPT,
      schema: QuizSchema,
    });

    await saveQuizQuestions(topicParticipationId, quizData.questions);
  }

  async sendQuizQuestion(chatId: number, topicParticipation: TopicParticipation, questionIndex: number): Promise<void> {
    if (!topicParticipation.quizDetails || questionIndex >= topicParticipation.quizDetails.questions.length) {
      return;
    }

    const question = topicParticipation.quizDetails.questions[questionIndex];
    const questionNumber = questionIndex + 1;
    const totalQuestions = topicParticipation.quizDetails.questions.length;

    const questionText = [`שאלה ${questionNumber} מתוך ${totalQuestions}:`, '', question.question].join('\n');

    const buttonLayout = question.options.map((option, index) => [
      {
        text: option,
        callback_data: [BOT_ACTIONS.QUIZ_ANSWER, topicParticipation._id, questionIndex, index].join(INLINE_KEYBOARD_SEPARATOR),
      },
    ]);

    await this.bot.sendMessage(chatId, questionText, { reply_markup: { inline_keyboard: buttonLayout } });
  }

  async checkQuizAnswer(topicParticipationId: string, questionIndex: number, userAnswerIndex: number, chatId: number, messageId: number): Promise<void> {
    const topicParticipation = await getTopicParticipation(topicParticipationId);
    if (!topicParticipation?.quizDetails) {
      return;
    }

    const question = topicParticipation.quizDetails.questions[questionIndex];
    const isCorrect = userAnswerIndex === question.correctAnswer;

    const answer: QuizAnswer = { questionIndex, userAnswer: userAnswerIndex, isCorrect, answeredAt: new Date() };
    await saveQuizAnswer(topicParticipationId, answer);

    await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId }).catch(() => {});

    if (isCorrect) {
      await this.bot.sendMessage(chatId, `✅ נכון! כל הכבוד! 🎉`);
    } else {
      const correctAnswerText = question.options[question.correctAnswer];
      await this.bot.sendMessage(chatId, [`❌ לא בדיוק...`, '', `התשובה הנכונה היא: ${correctAnswerText}`, '', `💡 ${question.explanation}`].join('\n'));
    }

    const updatedParticipation = await getTopicParticipation(topicParticipationId);
    const answersCount = updatedParticipation.quizDetails.answers.length;
    const totalQuestions = updatedParticipation.quizDetails.questions.length;

    if (answersCount < totalQuestions) {
      await this.sendQuizQuestion(chatId, updatedParticipation, answersCount);
    } else {
      const correctAnswers = updatedParticipation.quizDetails.answers.filter((a) => a.isCorrect).length;
      await updateQuizScore(topicParticipationId, correctAnswers);

      const scoreMessage = getScoreMessage(correctAnswers, totalQuestions);

      const completeButton = {
        text: '✅ סיימתי את הקורס ✅',
        callback_data: [BOT_ACTIONS.COMPLETE, topicParticipation._id].join(INLINE_KEYBOARD_SEPARATOR),
      };

      await this.bot.sendMessage(chatId, scoreMessage, { reply_markup: { inline_keyboard: [[completeButton]] } });
    }
  }
}
