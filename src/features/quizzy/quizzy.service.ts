import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { QuizzyMongoQuestionService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { AnswerModel } from '@core/mongo/quizzy-mongo/models/question.model';
import { NotifierService } from '@core/notifier';
import { generateRandomString, shuffleArray } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { BLOCKED_ERROR, getInlineKeyboardMarkup, sendShortenedMessage } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, QUIZZY_ASSISTANT_ID, QUIZZY_STRUCTURED_RES_INSTRUCTIONS, QUIZZY_STRUCTURED_RES_START } from './quizzy.config';
import { triviaSchema } from './types';

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

  async randomGameHandler(chatId: number): Promise<void> {
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
    await this.questionDB.markQuestionsCompleted(chatId); // marks all question for the user as completed

    const { question, correctAnswer, distractorAnswers } = await this.openaiAssistantService.getStructuredOutput(triviaSchema, QUIZZY_STRUCTURED_RES_INSTRUCTIONS, QUIZZY_STRUCTURED_RES_START);

    const correctAnswerModel: AnswerModel = { id: `ans_${generateRandomString(5)}`, text: correctAnswer, isCorrect: true };
    const answers: Array<AnswerModel> = shuffleArray([
      // br
      correctAnswerModel,
      ...distractorAnswers.map((ans) => ({ id: `ans_${generateRandomString(5)}`, text: ans })),
    ]);
    const { insertedId: questionId } = await this.questionDB.saveQuestion(chatId, question, answers);

    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      answers.map((answer) => ({
        text: answer.text,
        callback_data: `${BOT_ACTIONS.GAME}${INLINE_KEYBOARD_SEPARATOR}${questionId}${INLINE_KEYBOARD_SEPARATOR}${answer.id}${INLINE_KEYBOARD_SEPARATOR}${correctAnswerModel.id}`,
      })),
    );
    await this.bot.sendMessage(chatId, question, { ...(inlineKeyboardMarkup as any) });
    return { question, correctAnswer, distractorAnswers };
  }

  async processQuestion(chatId: number, content: string): Promise<void> {
    const questionObj = await this.questionDB.getQuestion({ questionId: null, chatId });
    let threadId = questionObj?.threadId;
    if (!threadId) {
      const { id } = await this.openaiAssistantService.createThread();
      threadId = id;
      await this.questionDB.updateQuestion({ chatId, questionId: questionObj._id.toString() }, { threadId });
    }

    const response = await this.openaiAssistantService.getAssistantAnswer(QUIZZY_ASSISTANT_ID, threadId, content);
    await sendShortenedMessage(this.bot, chatId, response);
  }
}
