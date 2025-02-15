import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EducatorMongoTopicService, EducatorMongoUserPreferencesService, TopicStatus } from '@core/mongo/educator-mongo';
import { getErrorMessage } from '@core/utils';
import { BOTS, getCallbackQueryData, getMessageData, handleCommand, MessageLoader, TELEGRAM_EVENTS, TelegramBotHandler } from '@services/telegram';
import { BOT_ACTIONS, CUSTOM_ERROR_MESSAGE, EDUCATOR_BOT_COMMANDS } from './educator-bot.config';
import { EducatorService } from './educator.service';

@Injectable()
export class EducatorBotService implements OnModuleInit {
  private readonly logger = new Logger(EducatorBotService.name);

  constructor(
    private readonly educatorService: EducatorService,
    private readonly mongoTopicService: EducatorMongoTopicService,
    private readonly mongoUserPreferencesService: EducatorMongoUserPreferencesService,
    @Inject(BOTS.EDUCATOR.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit() {
    this.bot.setMyCommands(Object.values(EDUCATOR_BOT_COMMANDS));
    const handlers: TelegramBotHandler[] = [
      { regex: EDUCATOR_BOT_COMMANDS.START.command, handler: this.startHandler },
      { regex: EDUCATOR_BOT_COMMANDS.STOP.command, handler: this.stopHandler },
      { regex: EDUCATOR_BOT_COMMANDS.TOPIC.command, handler: this.topicHandler },
      { regex: EDUCATOR_BOT_COMMANDS.CUSTOM.command, handler: this.customTopicHandler },
      { regex: EDUCATOR_BOT_COMMANDS.ADD.command, handler: this.addHandler },
    ];
    const handleCommandOptions = { bot: this.bot, logger: this.logger, isBlocked: true };

    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await handleCommand({
          ...handleCommandOptions,
          message,
          handlerName: handler.name,
          handler: async () => handler.call(this, message),
          customErrorMessage: CUSTOM_ERROR_MESSAGE,
        });
      });
    });

    this.bot.on(TELEGRAM_EVENTS.MESSAGE, async (message: Message) => {
      await handleCommand({
        ...handleCommandOptions,
        message,
        handlerName: this.messageHandler.name,
        handler: async () => this.messageHandler.call(this, message),
        customErrorMessage: CUSTOM_ERROR_MESSAGE,
      });
    });
    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    const replyText = [
      `שלום לך 👋`,
      `אני פה כדי ללמד אותך על כל מיני נושאים, כדי שהיה חכם יותר 😁`,
      `אני אשלח לך כל יום שיעורים על נושאים מעניינים`,
      `אפשר גם להשתמש בפקודה של נושא ולקבל אותו מיד`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async stopHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const replyText = [
      `סבבה, אני מפסיקה 🛑`,
      `תגיד לי מתי אתה רוצה לחזור ללמוד ונמשיך`,
      `כשתהיה מוכן, תשלח לי את הפקודה של ההתחלה ונחזור ללמוד`,
      `אתה יכול גם לבקש נושאים כשתרצה בלי תזכורות ממני, תשתמש בפקודה של הנושא`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
  }

  private async topicHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const activeTopic = await this.mongoTopicService.getActiveTopic();
    if (activeTopic?._id) {
      await this.mongoTopicService.markTopicCompleted(activeTopic._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId));
  }

  private async customTopicHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);
    const activeTopic = await this.mongoTopicService.getActiveTopic();
    if (activeTopic?._id) {
      await this.mongoTopicService.markTopicCompleted(activeTopic._id.toString());
    }

    const customTopic = text.replace(EDUCATOR_BOT_COMMANDS.CUSTOM.command, '').trim();
    if (!customTopic) {
      await this.bot.sendMessage(chatId, 'כדי לההשתמש בפקודה ההזאת, צריך לשלוח אותו ומיד לאחריה את הנושא');
      return;
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
    await this.mongoTopicService.addTopic(topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא`);
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(EDUCATOR_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const activeTopic = await this.mongoTopicService.getActiveTopic();
    if (!activeTopic) {
      await this.bot.sendMessage(chatId, `אני רואה שאין לך נושא פתוח, אז אני לא מבינה על מה לענות. אולי נתחיל נושא חדש?`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.educatorService.processQuestion(chatId, text, activeTopic);
    });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, firstName, lastName, data: response } = getCallbackQueryData(callbackQuery);
    const logBody = `${TELEGRAM_EVENTS.CALLBACK_QUERY} :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, response: ${response}`;
    this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - start`);

    try {
      const [topicId, action] = response.split(' - ');
      switch (action) {
        case BOT_ACTIONS.COMPLETE:
          await this.handleCallbackCompleteTopic(chatId, topicId);
          break;
        default:
          throw new Error('Invalid action');
      }
      this.logger.log(`${this.callbackQueryHandler.name} - ${logBody} - success`);
    } catch (err) {
      const errorMessage = `error: ${getErrorMessage(err)}`;
      this.logger.error(`${this.callbackQueryHandler.name} - chatId: ${chatId} - ${logBody} - ${errorMessage}`);
      await this.bot.sendMessage(chatId, CUSTOM_ERROR_MESSAGE);
    }
  }

  private async handleCallbackCompleteTopic(chatId: number, topicId: string): Promise<void> {
    const topic = await this.mongoTopicService.getTopic(topicId);
    if (!topic) {
      await this.bot.sendMessage(chatId, `וואלה לא מצאתי את הנושא, בטוח שיש נושא כזה?`);
      return;
    }

    if (topic.status === TopicStatus.Completed) {
      await this.bot.sendMessage(chatId, 'וואלה נראה שסיימת כבר את הנושא הזה');
      return;
    }

    await this.mongoTopicService.markTopicCompleted(topicId);
    await this.bot.sendMessage(chatId, '🔥');
  }
}
