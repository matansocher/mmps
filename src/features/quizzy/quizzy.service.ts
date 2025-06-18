import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { triviaTool } from '@features/quizzy/tools';
import { TriviaQuestionResult, triviaToolInstructions } from '@features/quizzy/tools/trivia';
import { AnthropicService } from '@services/anthropic';
import { BLOCKED_ERROR, getInlineKeyboardMarkup } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './quizzy.config';

@Injectable()
export class QuizzyService {
  constructor(
    private readonly subscriptionDB: QuizzyMongoSubscriptionService,
    private readonly userDB: QuizzyMongoUserService,
    private readonly anthropic: AnthropicService,
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

  async gameHandler(chatId: number): Promise<void> {
    const { question, correctAnswer, distractorAnswers } = await this.anthropic.executeTool<TriviaQuestionResult>(triviaTool, triviaToolInstructions);
    const options = shuffleArray([...distractorAnswers, correctAnswer]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((option) => ({ text: option, callback_data: `${BOT_ACTIONS.GAME} - ${option} - ${correctAnswer}` })));
    await this.bot.sendMessage(chatId, question, { ...(inlineKeyboardMarkup as any) });
  }
}
