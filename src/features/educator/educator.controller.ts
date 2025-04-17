import { promises as fs } from 'fs';
import TelegramBot, { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH, MY_USER_NAME } from '@core/config';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, EducatorMongoUserPreferencesService, EducatorMongoUserService, TopicParticipationStatus } from '@core/mongo/educator-mongo';
import { NotifierService } from '@core/notifier';
import { deleteFile } from '@core/utils';
import { OpenaiService } from '@services/openai';
import {
  BOT_BROADCAST_ACTIONS,
  BOTS,
  getCallbackQueryData,
  getInlineKeyboardMarkup,
  getMessageData,
  MessageLoader,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, EDUCATOR_BOT_COMMANDS } from './educator.config';
import { EducatorService } from './educator.service';

const customErrorMessage = `וואלה מצטערת, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`;

@Injectable()
export class EducatorController implements OnModuleInit {
  private readonly logger = new Logger(EducatorController.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly openaiService: OpenaiService,
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoTopicParticipationService: EducatorMongoTopicParticipationService,
    private readonly mongoUserPreferencesService: EducatorMongoUserPreferencesService,
    private readonly mongoUserService: EducatorMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.EDUCATOR.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(EDUCATOR_BOT_COMMANDS));

    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { ACTIONS, TOPIC, ADD } = EDUCATOR_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: TOPIC.command, handler: (message) => this.topicHandler.call(this, message) },
      { event: COMMAND, regex: ADD.command, handler: (message) => this.addHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const userPreferences = await this.mongoUserPreferencesService.getUserPreference(chatId);
    const inlineKeyboardButtons = [
      userPreferences?.isStopped ? { text: '🟢 התחל לקבל שיעורים יומיים 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 הפסק לקבל שיעורים יומיים 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👩🏻‍ איך אני יכולה לעזור?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons) as any) });
  }

  private async topicHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const Participation = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (Participation?._id) {
      await this.mongoTopicParticipationService.markTopicParticipationCompleted(Participation._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId));

    this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.TOPIC }, userDetails);
  }

  private async addHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const topic = message.text.replace(EDUCATOR_BOT_COMMANDS.ADD.command, '').trim();
    if (!topic?.length) {
      await this.bot.sendMessage(chatId, `אין בעיה אני אוסיף מה שתגיד לי רק תרשום לי בנוסף לפקודה את הנושא`);
      return;
    }
    await this.mongoTopicService.createTopic(chatId, topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא, ונלמד על זה בשיעורים הבאים`);

    this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.ADD_TOPIC }, userDetails);
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(EDUCATOR_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const activeTopicParticipation = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (!activeTopicParticipation) {
      await this.bot.sendMessage(chatId, `אני רואה שאין לך נושא פתוח, אז אני לא מבינה על מה לענות. אולי נתחיל נושא חדש?`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.educatorService.processQuestion(chatId, text, activeTopicParticipation);
    });

    const topic = await this.mongoTopicService.getTopic(activeTopicParticipation.topicId);
    this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text, topic: topic?.title }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    const [action, topicParticipationId] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.START:
        await this.startHandler(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.TRANSCRIBE:
        await this.handleCallbackTranscribeMessage(chatId, messageId, text, replyMarkup);
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.TRANSCRIBE_TOPIC }, userDetails);
        break;
      case BOT_ACTIONS.COMPLETE:
        await this.handleCallbackCompleteTopic(chatId, messageId, topicParticipationId);
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.COMPLETED_TOPIC }, userDetails);
        break;
      default:
        this.notifier.notify(BOTS.EDUCATOR, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async startHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    const userExists = await this.mongoUserService.saveUserDetails(userDetails);
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
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
    const replyText = [`סבבה, אני מפסיקה 🛑`, `כדי לחזור ללמוד - אפשר להשתמש בפקודה`, `אפשר גם לבקש נושאים בלי תזכורות ממני, גם לזה הכנתי פקודה`].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
  }

  private async handleCallbackTranscribeMessage(chatId: number, messageId: number, text: string, replyMarkup: InlineKeyboardMarkup): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🎧', loadingAction: BOT_BROADCAST_ACTIONS.UPLOADING_VOICE });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const result = await this.openaiService.getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.sendVoice(chatId, audioFilePath);

      const filteredInlineKeyboardMarkup = removeItemFromInlineKeyboardMarkup(replyMarkup, BOT_ACTIONS.TRANSCRIBE);
      await this.bot.editMessageReplyMarkup(filteredInlineKeyboardMarkup as any, { message_id: messageId, chat_id: chatId });
      await deleteFile(audioFilePath);
    });
  }

  private async handleCallbackCompleteTopic(chatId: number, messageId: number, topicParticipationId: string): Promise<void> {
    const topic = await this.mongoTopicParticipationService.getTopicParticipation(topicParticipationId);
    if (!topic) {
      await this.bot.sendMessage(chatId, `נראה לי שסיימת את הנושא הזה, הכל טוב`);
      return;
    }

    if (topic.status === TopicParticipationStatus.Completed) {
      await this.bot.sendMessage(chatId, 'וואלה נראה שסיימת כבר את הנושא הזה');
      return;
    }

    await this.mongoTopicParticipationService.markTopicParticipationCompleted(topicParticipationId);
    await this.bot.sendMessage(chatId, '🔥');
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
  }
}
