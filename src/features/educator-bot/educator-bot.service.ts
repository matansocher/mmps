import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { EducatorMongoTopicParticipationService, EducatorMongoTopicService, EducatorMongoUserPreferencesService, EducatorMongoUserService, TopicParticipationStatus } from '@core/mongo/educator-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { ANALYTIC_EVENT_NAMES } from '@features/wolt-bot/wolt-bot.config';
import { BOTS, getCallbackQueryData, getMessageData, MessageLoader, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { BOT_ACTIONS, EDUCATOR_BOT_COMMANDS } from './educator-bot.config';
import { EducatorService } from './educator.service';

export const customErrorMessage = `וואלה מצטערת, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`;

@Injectable()
export class EducatorBotService implements OnModuleInit {
  private readonly logger = new Logger(EducatorBotService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoTopicParticipationService: EducatorMongoTopicParticipationService,
    private readonly mongoUserPreferencesService: EducatorMongoUserPreferencesService,
    private readonly mongoUserService: EducatorMongoUserService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.EDUCATOR.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(EDUCATOR_BOT_COMMANDS));

    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, STOP, TOPIC, CUSTOM, ADD, CONTACT } = EDUCATOR_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: STOP.command, handler: (message) => this.stopHandler.call(this, message) },
      { event: COMMAND, regex: TOPIC.command, handler: (message) => this.topicHandler.call(this, message) },
      { event: COMMAND, regex: ADD.command, handler: (message) => this.addHandler.call(this, message) },
      { event: COMMAND, regex: CUSTOM.command, handler: (message) => this.customTopicHandler.call(this, message) },
      { event: COMMAND, regex: CONTACT.command, handler: (message) => this.contactHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    await this.mongoUserService.saveUserDetails(userDetails);
    const replyText = [
      `שלום לך 👋`,
      `אני פה כדי ללמד אותך על כל מיני נושאים, כדי שתהיה חכם יותר 😁`,
      `אני אשלח לך כל יום שיעורים על נושאים מעניינים`,
      `יש עוד כמה פקודות מעניינות שהגדרו ששווה לבדוק`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async stopHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
    const replyText = [`סבבה, אני מפסיקה 🛑`, `תגיד לי מתי אתה רוצה לחזור ללמוד ונמשיך - רק תשלח לי את הפקודה`, `אתה יכול גם לבקש נושאים כשתרצה בלי תזכורות ממני, גם לזה הכנתי פקודה`].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  async contactHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
    this.notifierBotService.notify(BOTS.WOLT, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
  }

  private async topicHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const Participation = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (Participation?._id) {
      await this.mongoTopicParticipationService.markTopicParticipationCompleted(Participation._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId));
  }

  private async customTopicHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    const customTopic = text.replace(EDUCATOR_BOT_COMMANDS.CUSTOM.command, '').trim();
    if (!customTopic) {
      await this.bot.sendMessage(chatId, 'כדי לההשתמש בפקודה ההזאת, צריך לשלוח אותו ומיד לאחריה את הנושא');
      return;
    }

    const Participation = await this.mongoTopicParticipationService.getActiveTopicParticipation(chatId);
    if (Participation?._id) {
      await this.mongoTopicParticipationService.markTopicParticipationCompleted(Participation._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId, customTopic));
  }

  private async addHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const topic = message.text.replace(EDUCATOR_BOT_COMMANDS.ADD.command, '').trim();
    if (!topic?.length) {
      await this.bot.sendMessage(chatId, `אין בעיה אני אוסיף מה שתגיד לי רק תרשום לי בנוסף לפקודה את הנושא`);
      return;
    }
    await this.mongoTopicService.createTopic(chatId, topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא, ונלמד על זה בשיעורים הבאים`);
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

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
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [topicParticipationId, action] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.COMPLETE:
        await this.handleCallbackCompleteTopic(chatId, messageId, topicParticipationId);
        break;
      default:
        throw new Error('Invalid action');
    }
  }

  private async handleCallbackCompleteTopic(chatId: number, messageId: number, topicParticipationId: string): Promise<void> {
    const topic = await this.mongoTopicParticipationService.getTopicParticipation(topicParticipationId);
    if (!topic) {
      await this.bot.sendMessage(chatId, `וואלה לא מצאתי את הנושא, בטוח שיש נושא כזה?`);
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
