import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Answer, QuizzyMongoQuestionService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
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
    const questions = await this.questionDB.markQuestionsCompleted(chatId); // marks all questions for the user as completed
    await Promise.all(
      questions.map(({ revealMessageId }) => {
        revealMessageId && this.bot.editMessageReplyMarkup({} as InlineKeyboardMarkup, { message_id: revealMessageId, chat_id: chatId }).catch();
      }),
    );
    const { question, correctAnswer, distractorAnswers } = await this.openaiAssistantService.getStructuredOutput(triviaSchema, QUIZZY_STRUCTURED_RES_INSTRUCTIONS, QUIZZY_STRUCTURED_RES_START);

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
    await this.bot.sendMessage(chatId, question, { ...inlineKeyboardMarkup });
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
