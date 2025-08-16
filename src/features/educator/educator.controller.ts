import { promises as fs } from 'fs';
import TelegramBot, { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH, MY_USER_NAME } from '@core/config';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, EducatorMongoUserPreferencesService, EducatorMongoUserService } from '@core/mongo/educator-mongo';
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
  reactToMessage,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './educator.config';
import { EducatorService } from './educator.service';

const loaderMessage = '👩‍🏫 אני אחשוב על זה כמה שניות ואני איתך...';
const transcribeLoaderMessage = '👩‍🏫 כמה שניות ואני מתמללת לך את זה...';
const customErrorMessage = `וואלה מצטערת, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`;

@Injectable()
export class EducatorController implements OnModuleInit {
  private readonly logger = new Logger(EducatorController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly topicDB: EducatorMongoTopicService,
    private readonly topicParticipationDB: EducatorMongoTopicParticipationService,
    private readonly userPreferencesDB: EducatorMongoUserPreferencesService,
    private readonly userDB: EducatorMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
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
    const userPreferences = await this.userPreferencesDB.getUserPreference(chatId);
    const inlineKeyboardButtons = [
      userPreferences?.isStopped ? { text: '🟢 התחל לקבל שיעורים יומיים 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 הפסק לקבל שיעורים יומיים 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👩🏻‍ איך אני יכולה לעזור?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  private async topicHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);
    const Participation = await this.topicParticipationDB.getActiveTopicParticipation(chatId);
    if (Participation?._id) {
      await this.topicParticipationDB.markTopicParticipationCompleted(Participation._id.toString());
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
    await this.topicDB.createTopic(chatId, topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא, ונלמד על זה בשיעורים הבאים`);

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ADD_TOPIC }, userDetails);
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const activeTopicParticipation = await this.topicParticipationDB.getActiveTopicParticipation(chatId);
    if (!activeTopicParticipation) {
      await this.bot.sendMessage(chatId, `אני רואה שאין לך נושא פתוח, אז אני לא מבינה על מה לענות. אולי נתחיל נושא חדש?`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.educatorService.processQuestion(chatId, activeTopicParticipation, text);
    });

    const topic = await this.topicDB.getTopic(activeTopicParticipation.topicId);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text, topic: topic?.title }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    const [action, topicParticipationId] = response.split(' - ');
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
      default:
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    await this.userPreferencesDB.createUserPreference(chatId);
    const userExists = await this.userDB.saveUserDetails(userDetails);
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
    await this.userPreferencesDB.updateUserPreference(chatId, { isStopped: true });
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
    const topicParticipation = await this.topicParticipationDB.markTopicParticipationCompleted(topicParticipationId);
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
    await reactToMessage(this.botToken, chatId, messageId, '😎');

    const threadMessages = topicParticipation.threadMessages || [];
    await Promise.all(threadMessages.map((messageId) => this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {})));

    // summarize the topic with key takeaways, and add some code to create reminder of the material learned so the user can review it later
  }
}
