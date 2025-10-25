import { promises as fs } from 'fs';
import { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH, MY_USER_NAME } from '@core/config';
import { NotifierService } from '@core/notifier';
import { deleteFile } from '@core/utils';
import { getAudioFromText } from '@services/openai';
import {
  BOT_BROADCAST_ACTIONS,
  getBotToken,
  getCallbackQueryData,
  getInlineKeyboardMarkup,
  getMessageData,
  MessageLoader,
  provideTelegramBot,
  reactToMessage,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './educator.config';
import { EducatorService } from './educator.service';
import {
  createTopic,
  createUserPreference,
  getActiveTopicParticipation,
  getTopic,
  getTopicParticipation,
  getUserPreference,
  markTopicParticipationCompleted,
  saveUserDetails,
  updateUserPreference,
} from './mongo';

const loaderMessage = '👩‍🏫 אני אחשוב על זה כמה שניות ואני איתך...';
const transcribeLoaderMessage = '👩‍🏫 כמה שניות ואני מתמללת לך את זה...';
const customErrorMessage = `וואלה מצטערת, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`;

@Injectable()
export class EducatorController implements OnModuleInit {
  private readonly logger = new Logger(EducatorController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, ACTIONS, TOPIC, ADD } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: TOPIC.command, handler: (message) => this.topicHandler.call(this, message) },
      { event: COMMAND, regex: ADD.command, handler: (message) => this.addHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const userPreferences = await getUserPreference(chatId);
    const inlineKeyboardButtons = [
      userPreferences?.isStopped ? { text: '🟢 התחל לקבל שיעורים יומיים 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 הפסק לקבל שיעורים יומיים 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👩🏻‍ איך אני יכולה לעזור?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  private async topicHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);
    const Participation = await getActiveTopicParticipation(chatId);
    if (Participation?._id) {
      await markTopicParticipationCompleted(Participation._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId));

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TOPIC }, userDetails);
  }

  private async addHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const topic = message.text.replace(BOT_CONFIG.commands.ADD.command, '').trim();
    if (!topic?.length) {
      await this.bot.sendMessage(chatId, `אין בעיה אני אוסיף מה שתגיד לי רק תרשום לי בנוסף לפקודה את הנושא`);
      return;
    }
    await createTopic(chatId, topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא, ונלמד על זה בשיעורים הבאים`);

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ADD_TOPIC }, userDetails);
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const activeTopicParticipation = await getActiveTopicParticipation(chatId);
    if (!activeTopicParticipation) {
      await this.bot.sendMessage(chatId, `אני רואה שאין לך נושא פתוח, אז אני לא מבינה על מה לענות. אולי נתחיל נושא חדש?`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.educatorService.processQuestion(chatId, activeTopicParticipation, text);
    });

    const topic = await getTopic(activeTopicParticipation.topicId);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text, topic: topic?.title }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    const responseParts = response.split(INLINE_KEYBOARD_SEPARATOR);
    const [action, topicParticipationId] = responseParts;

    switch (action) {
      case BOT_ACTIONS.START:
        await this.userStart(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.TRANSCRIBE:
        await this.handleCallbackTranscribeMessage(chatId, messageId, text, replyMarkup);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TRANSCRIBE_TOPIC }, userDetails);
        break;
      case BOT_ACTIONS.COMPLETE:
        await this.handleCallbackCompleteTopic(chatId, messageId, topicParticipationId);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.COMPLETED_TOPIC }, userDetails);
        break;
      case BOT_ACTIONS.QUIZ:
        await this.handleCallbackQuiz(chatId, topicParticipationId, userDetails);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.QUIZ_STARTED }, userDetails);
        break;
      case BOT_ACTIONS.QUIZ_ANSWER:
        const questionIndex = parseInt(responseParts[2], 10);
        const answerIndex = parseInt(responseParts[3], 10);
        await this.handleCallbackQuizAnswer(chatId, messageId, topicParticipationId, questionIndex, answerIndex, userDetails);
        break;
      default:
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    await createUserPreference(chatId);
    const userExists = await saveUserDetails(userDetails);
    const newUserReplyText = [
      `שלום לך 👋`,
      `אני פה כדי ללמד אותך על כל מיני נושאים, כדי שתהיה חכם יותר 😁`,
      `לא צריך לעשות יותר כלום, אני אשלח כל יום שיעורים על נושאים מעניינים בשעות שונות של היום`,
      `יש לי עוד כמה פקודות מעניינות ששווה לבדוק`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אשלח כל יום שיעורים על נושאים מעניינים בשעות שונות של היום`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await updateUserPreference(chatId, { isStopped: true });
    const replyText = [`סבבה, אני מפסיקה 🛑`, `כדי לחזור ללמוד - אפשר להשתמש בפקודה`, `אפשר גם לבקש נושאים בלי תזכורות ממני, גם לזה הכנתי פקודה`].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
  }

  private async handleCallbackTranscribeMessage(chatId: number, messageId: number, text: string, replyMarkup: InlineKeyboardMarkup): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { loadingAction: BOT_BROADCAST_ACTIONS.UPLOADING_VOICE, loaderMessage: transcribeLoaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const filteredInlineKeyboardMarkup = removeItemFromInlineKeyboardMarkup(replyMarkup, BOT_ACTIONS.TRANSCRIBE);
      await this.bot.editMessageReplyMarkup(filteredInlineKeyboardMarkup, { message_id: messageId, chat_id: chatId }).catch(() => {});

      await reactToMessage(this.botToken, chatId, messageId, '🤯');

      const result = await getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/educator-text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.sendVoice(chatId, audioFilePath);
      await deleteFile(audioFilePath);
    });
  }

  private async handleCallbackCompleteTopic(chatId: number, messageId: number, topicParticipationId: string): Promise<void> {
    const topicParticipation = await markTopicParticipationCompleted(topicParticipationId);
    const messagesToUpdate = [messageId, ...(topicParticipation?.threadMessages || [])];
    await Promise.all(
      messagesToUpdate.map(async (messageId) => {
        await Promise.all([this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {}), reactToMessage(this.botToken, chatId, messageId, '😎')]);
      }),
    );

    this.educatorService.generateTopicSummary(topicParticipationId);
  }

  private async handleCallbackQuiz(chatId: number, topicParticipationId: string, userDetails: UserDetails): Promise<void> {
    const quizLoaderMessage = '🎯 אני מכינה לך בוחן קצר...';
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, undefined, { reactionEmoji: '🤔', loaderMessage: quizLoaderMessage });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.educatorService.generateQuiz(topicParticipationId);

      const topicParticipation = await getTopicParticipation(topicParticipationId);
      if (!topicParticipation) {
        await this.bot.sendMessage(chatId, 'משהו השתבש... לא הצלחתי ליצור את הבוחן. נסה שוב מאוחר יותר.');
        return;
      }

      await this.bot.sendMessage(chatId, [`🎯 בוחן קצר על הנושא שלמדנו!`, '', `יש 3 שאלות - בואו נראה כמה אתה זוכר 😊`].join('\n'));

      await this.educatorService.sendQuizQuestion(chatId, topicParticipation, 0);
    });

    const topic = await getTopic((await getTopicParticipation(topicParticipationId))?.topicId);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.QUIZ_STARTED, topic: topic?.title }, userDetails);
  }

  private async handleCallbackQuizAnswer(chatId: number, messageId: number, topicParticipationId: string, questionIndex: number, answerIndex: number, userDetails: UserDetails): Promise<void> {
    await this.educatorService.checkQuizAnswer(topicParticipationId, questionIndex, answerIndex, chatId, messageId);

    const topicParticipation = await getTopicParticipation(topicParticipationId);
    if (topicParticipation?.quizDetails?.completedAt) {
      const topic = await getTopic(topicParticipation.topicId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.QUIZ_COMPLETED, score: topicParticipation.quizDetails.score, topic: topic?.title }, userDetails);
    }
  }
}
