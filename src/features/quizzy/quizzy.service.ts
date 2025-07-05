import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Answer, QuizzyMongoQuestionService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { NotifierService } from '@core/notifier';
import { generateRandomString, shuffleArray } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/openai.config';
import { BLOCKED_ERROR, getInlineKeyboardMarkup, sendShortenedMessage } from '@services/telegram';
import {
  ANALYTIC_EVENT_NAMES,
  BOT_ACTIONS,
  BOT_CONFIG,
  FREE_TEXT_CHECK_INSTRUCTIONS,
  FREE_TEXT_CHECK_THRESHOLD,
  INLINE_KEYBOARD_SEPARATOR,
  NEW_QUESTION_INSTRUCTIONS,
  NEW_QUESTION_USER_MESSAGE,
  QUIZZY_ASSISTANT_ID,
} from './quizzy.config';
import { messageEvaluationSchema, triviaQuestionSchema } from './types';

@Injectable()
export class QuizzyService {
  constructor(
    private readonly subscriptionDB: QuizzyMongoSubscriptionService,
    private readonly userDB: QuizzyMongoUserService,
    private readonly questionDB: QuizzyMongoQuestionService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async scheduledGameHandler(chatId: number): Promise<void> {
    try {
      await this.gameHandler(chatId);
    } catch (err) {
      if (err.message.includes(BLOCKED_ERROR)) {
        const userDetails = await this.userDB.getUserDetails({ chatId });
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
        await this.subscriptionDB.updateSubscription(chatId, { isActive: false });
      }
    }
  }

  async gameHandler(chatId: number) {
    await this.markAssignedQuestionsCompleted(chatId);
    const { question, correctAnswer, distractorAnswers } = await this.openaiAssistantService.getStructuredOutput(triviaQuestionSchema, NEW_QUESTION_INSTRUCTIONS, NEW_QUESTION_USER_MESSAGE);

    const correctAnswerObj: Answer = { id: `ans_${generateRandomString(5)}`, text: correctAnswer, isCorrect: true };
    const answers: Array<Answer> = shuffleArray([
      // br
      correctAnswerObj,
      ...distractorAnswers.map((ans) => ({ id: `ans_${generateRandomString(5)}`, text: ans })),
    ]);
    const { insertedId: questionId } = await this.questionDB.saveQuestion(chatId, question, answers);

    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      answers.map((answer) => ({
        text: answer.text,
        callback_data: [BOT_ACTIONS.GAME, questionId, answer.id, correctAnswerObj.id].join(INLINE_KEYBOARD_SEPARATOR),
      })),
    );
    const { message_id } = await this.bot.sendMessage(chatId, question, { ...inlineKeyboardMarkup });
    this.questionDB.updateQuestion({ chatId }, { originalMessageId: message_id });
    return { question, correctAnswer, distractorAnswers };
  }

  async processQuestion(chatId: number, content: string): Promise<void> {
    const activeQuestion = await this.questionDB.getActiveQuestion({ questionId: null, chatId });
    let threadId = activeQuestion?.threadId;
    if (!threadId) {
      const { id } = await this.openaiAssistantService.createThread();
      threadId = id;
      await this.questionDB.updateQuestion({ chatId, questionId: activeQuestion._id.toString() }, { threadId });
    }

    const { userWantsNewQuestion } = await this.openaiAssistantService.getStructuredOutput(messageEvaluationSchema, FREE_TEXT_CHECK_INSTRUCTIONS, content, CHAT_COMPLETIONS_MINI_MODEL);
    if (userWantsNewQuestion > FREE_TEXT_CHECK_THRESHOLD) {
      const { question, correctAnswer, distractorAnswers } = await this.gameHandler(chatId);
      const userDetails = await this.userDB.getUserDetails({ chatId });
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.GAME, question, correct: correctAnswer, distractors: distractorAnswers.join(', ') }, userDetails);
      return;
    }

    const response = await this.openaiAssistantService.getAssistantAnswer(QUIZZY_ASSISTANT_ID, threadId, content);
    await sendShortenedMessage(this.bot, chatId, response);
  }

  async markAssignedQuestionsCompleted(chatId: number): Promise<void> {
    const questions = await this.questionDB.markQuestionsCompleted(chatId); // marks all questions for the user as completed
    await Promise.all(
      questions.map(({ originalMessageId, revealMessageId }) => {
        originalMessageId && this.bot.editMessageReplyMarkup(undefined, { message_id: originalMessageId, chat_id: chatId }).catch(() => {});
        revealMessageId && this.bot.editMessageReplyMarkup(undefined, { message_id: revealMessageId, chat_id: chatId }).catch(() => {});
      }),
    );
  }
}
