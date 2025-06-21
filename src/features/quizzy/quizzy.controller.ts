import TelegramBot, { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MY_USER_NAME } from '@core/config';
import { QuizzyMongoGameLogService, QuizzyMongoQuestionService, QuizzyMongoSubscriptionService, QuizzyMongoUserService } from '@core/mongo/quizzy-mongo';
import { NotifierService } from '@core/notifier';
import {
  getBotToken,
  getCallbackQueryData,
  getInlineKeyboardMarkup,
  getMessageData,
  MessageLoader,
  reactToMessage,
  registerHandlers,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './quizzy.config';
import { QuizzyService } from './quizzy.service';
import { generateInitialExplanationPrompt, generateSpecialMessage } from './utils';

const loaderMessage = 'אני שניה חושב ונותן הסבר 🤔';
const customErrorMessage = 'אופס, קרתה לי תקלה, אבל אפשר לנסות שוב מאוחר יותר 🙁';

@Injectable()
export class QuizzyController implements OnModuleInit {
  private readonly logger = new Logger(QuizzyController.name);
  private readonly botToken: string;

  constructor(
    private readonly quizzyService: QuizzyService,
    private readonly userDB: QuizzyMongoUserService,
    private readonly subscriptionDB: QuizzyMongoSubscriptionService,
    private readonly gameLogDB: QuizzyMongoGameLogService,
    private readonly questionDB: QuizzyMongoQuestionService,
    private readonly notifier: NotifierService,
    private readonly configService: ConfigService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {
    this.botToken = getBotToken(BOT_CONFIG.id, this.configService.get(BOT_CONFIG.token));
  }

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, GAME, ACTIONS } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: GAME.command, handler: (message) => this.gameHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const subscription = await this.subscriptionDB.getSubscription(chatId);
    const inlineKeyboardButtons = [
      !subscription?.isActive
        ? { text: '🟢 רוצה להתחיל לקבל שאלות יומיות 🟢', callback_data: `${BOT_ACTIONS.START}` }
        : { text: '🛑 רוצה להפסיק לקבל שאלות יומיות 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, 'איך אני יכול לעזור? 👨‍🏫', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons) as any) });
  }

  async gameHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      const { question, correctAnswer, distractorAnswers } = await this.quizzyService.gameHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.GAME, question, correct: correctAnswer, distractors: distractorAnswers.join(', ') }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.GAME, error: `${err}` }, userDetails);
      throw err;
    }
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const { threadId } = await this.questionDB.getQuestion({ chatId });
    if (!threadId) {
      await this.bot.sendMessage(chatId, `שכחתי כבר על מה דיברנו 😁. אולי נתחיל שאלה חדש?`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.quizzyService.processQuestion(chatId, text);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response, text } = getCallbackQueryData(callbackQuery);

    const [action, questionId, selectedAnswerId, correctAnswerId] = response.split(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
        case BOT_ACTIONS.START:
          await this.userStart(chatId, userDetails);
          await this.bot.deleteMessage(chatId, messageId).catch();
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
          break;
        case BOT_ACTIONS.STOP:
          await this.stopHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch();
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
          break;
        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch();
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
          break;
        case BOT_ACTIONS.GAME:
          const { question, correctAnswer, selectedAnswer } = await this.gameAnswerHandler(chatId, messageId, questionId, selectedAnswerId, correctAnswerId);
          await this.gameLogDB.saveGameLog(chatId, text, correctAnswerId, selectedAnswerId);
          this.notifier.notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, question, isCorrect: correctAnswer === selectedAnswer ? '🟢' : '🔴', correct: correctAnswer, selected: selectedAnswer },
            userDetails,
          );
          break;
        case BOT_ACTIONS.EXPLAIN:
          await this.explainAnswerHandler(chatId, messageId, questionId, selectedAnswerId);
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.EXPLAINED }, userDetails);
          break;
        default:
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
          throw new Error('Invalid action');
      }

      const userGameLogs = await this.gameLogDB.getUserGameLogs(chatId);
      const specialMessage = generateSpecialMessage(userGameLogs);
      if (specialMessage) {
        await this.bot.sendMessage(chatId, specialMessage);
      }
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `${action} answer`, error: `${err}` }, userDetails);
      throw err;
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    const userExists = await this.userDB.saveUserDetails(userDetails);

    const subscription = await this.subscriptionDB.getSubscription(chatId);
    subscription ? await this.subscriptionDB.updateSubscription(chatId, { isActive: true }) : await this.subscriptionDB.addSubscription(chatId);

    const newUserReplyText = [
      `היי 👋`,
      'אני בוט טריוויה 😁',
      'כל יום אני אשלח לכם שאלה 🌎',
      'אפשר גם לשחק מתי שרוצים בפקודות שלי, פה למטה 👇',
      `אם אתם רוצים שאני אפסיק לשלוח שאלות בכל יום, אפשר פשוט לבקש ממני בפקודה ׳פעולות׳, פה למטה 👇`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אשלח שאלות בכל יום 🟢`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.subscriptionDB.updateSubscription(chatId, { isActive: false });
    await this.bot.sendMessage(chatId, `אין בעיה, אני אפסיק לשלוח שאלות בכל יום 🛑`);
  }

  private async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, ['אשמח לעזור', 'אפשר לדבר עם מי שיצר אותי, הוא בטח ידע לעזור', MY_USER_NAME].join('\n'));
  }

  private async gameAnswerHandler(
    chatId: number,
    messageId: number,
    questionId: string,
    selectedAnswerId: string,
    correctAnswerId: string,
  ): Promise<{ question: string; correctAnswer: string; selectedAnswer: string }> {
    await this.bot.editMessageReplyMarkup({} as InlineKeyboardMarkup, { message_id: messageId, chat_id: chatId });
    const questionObj = await this.questionDB.getQuestion({ questionId });
    if (!questionObj) {
      await this.bot.sendMessage(chatId, `שכחתי כבר על מה דיברנו 😁. אולי נתחיל שאלה חדש?`);
      return;
    }
    const { question, answers } = questionObj;
    const selectedAnswer = answers.find((ans) => ans.id === selectedAnswerId);
    const correctAnswer = answers.find((ans) => ans.id === correctAnswerId);
    const replyText = [!selectedAnswer.isCorrect ? `אופס, טעות` : `נכון, יפה מאוד!`, `ענית: ${selectedAnswer.text}`, !selectedAnswer.isCorrect ? `התשובה הנכונה: ${correctAnswer.text}` : null]
      .filter(Boolean)
      .join('\n');
    const inlineKeyboardMarkup = getInlineKeyboardMarkup([
      {
        text: '📝 הסבר 📝',
        callback_data: [BOT_ACTIONS.EXPLAIN, questionId, selectedAnswerId].join(INLINE_KEYBOARD_SEPARATOR),
      },
    ]);
    const { message_id } = await this.bot.sendMessage(chatId, replyText, { ...(inlineKeyboardMarkup as any) });
    this.questionDB.updateQuestion({ chatId }, { revealMessageId: message_id });
    await reactToMessage(this.botToken, chatId, messageId, selectedAnswerId !== correctAnswerId ? '👎' : '👍');

    return { question, correctAnswer: correctAnswer.text, selectedAnswer: selectedAnswer.text };
  }

  private async explainAnswerHandler(chatId: number, messageId: number, questionId: string, selectedAnswerId: string): Promise<void> {
    await this.bot.editMessageReplyMarkup({} as InlineKeyboardMarkup, { message_id: messageId, chat_id: chatId });
    const questionObj = await this.questionDB.getQuestion({ questionId });
    if (!questionObj) {
      await this.bot.sendMessage(chatId, `שכחתי כבר על מה דיברנו 😁. אולי נתחיל שאלה חדש?`);
      return;
    }
    const { question, answers } = questionObj;
    const selectedAnswer = answers.find((ans) => ans.id === selectedAnswerId);
    const correctAnswer = answers.find((ans) => ans.isCorrect);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const distractorAnswers = answers.filter((ans) => !ans.isCorrect).map((ans) => ans.text);
      await this.quizzyService.processQuestion(chatId, generateInitialExplanationPrompt({ question, correctAnswer: correctAnswer.text, distractorAnswers }, selectedAnswer.text));
    });
  }
}
