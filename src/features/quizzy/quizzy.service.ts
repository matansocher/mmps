import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { BLOCKED_ERROR, getInlineKeyboardMarkup, sendShortenedMessage } from '@services/telegram';
import { ThreadsCacheService } from './cache';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, QUIZZY_ASSISTANT_ID, QUIZZY_STRUCTURED_RES_INSTRUCTIONS, QUIZZY_STRUCTURED_RES_START } from './quizzy.config';
import { triviaSchema } from './types';

@Injectable()
export class QuizzyService {
  constructor(
    private readonly subscriptionDB: QuizzyMongoSubscriptionService,
    private readonly userDB: QuizzyMongoUserService,
    private readonly threadsCache: ThreadsCacheService,
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
    const { question, correctAnswer, distractorAnswers } = await this.openaiAssistantService.getStructuredOutput(triviaSchema, QUIZZY_STRUCTURED_RES_INSTRUCTIONS, QUIZZY_STRUCTURED_RES_START);
    const options = shuffleArray([...distractorAnswers, correctAnswer]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((option) => ({ text: option, callback_data: `${BOT_ACTIONS.GAME}${INLINE_KEYBOARD_SEPARATOR}${option}${INLINE_KEYBOARD_SEPARATOR}${correctAnswer}` })),
    );
    await this.bot.sendMessage(chatId, question, { ...(inlineKeyboardMarkup as any) });
    return { question, correctAnswer, distractorAnswers };
  }

  async processQuestion(chatId: number, content: string): Promise<void> {
    const threadData = this.threadsCache.getThreadData(chatId);
    let threadId = threadData?.threadId;
    if (!threadId) {
      const { id } = await this.openaiAssistantService.createThread();
      threadId = id;
      this.threadsCache.saveThreadData(chatId, { ...threadData, threadId });
    }

    const response = await this.openaiAssistantService.getAssistantAnswer(QUIZZY_ASSISTANT_ID, threadId, content);
    await sendShortenedMessage(this.bot, chatId, response);
  }
}
