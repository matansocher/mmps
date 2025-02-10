import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { EducatorMongoTopicService, EducatorMongoUserPreferencesService, TopicStatus } from '@core/mongo/educator-mongo';
import { getErrorMessage } from '@core/utils';
import { BOTS, getCallbackQueryData, getMessageData, handleCommand, MessageLoader, TELEGRAM_EVENTS, TelegramBotHandler } from '@services/telegram';
import { BOT_ACTIONS, EDUCATOR_BOT_COMMANDS } from './educator-bot.config';
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
      { regex: EDUCATOR_BOT_COMMANDS.TOPIC.command, handler: this.TopicHandler },
      { regex: EDUCATOR_BOT_COMMANDS.ADD.command, handler: this.addHandler },
    ];
    const handleCommandOptions = { logger: this.logger, isBlocked: true };

    handlers.forEach(({ regex, handler }) => {
      this.bot.onText(new RegExp(regex), async (message: Message) => {
        await handleCommand({
          ...handleCommandOptions,
          message,
          handlerName: handler.name,
          handler: async () => handler.call(this, message),
        });
      });
    });

    this.bot.on(TELEGRAM_EVENTS.MESSAGE, async (message: Message) => {
      await handleCommand({
        ...handleCommandOptions,
        message,
        handlerName: this.messageHandler.name,
        handler: async () => this.messageHandler.call(this, message),
      });
    });
    this.bot.on(TELEGRAM_EVENTS.CALLBACK_QUERY, (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  private async startHandler(message: Message) {
    const { chatId } = getMessageData(message);
    await this.mongoUserPreferencesService.createUserPreference(chatId);
    const replyText = [
      `הופה שלום 👋`,
      `אני פה כדי ללמד אותך על כל מיני נושאים, כדי שהיה חכם יותר 😁`,
      `אני אשלח לך כל יום שיעורים על נושאים מעניינים`,
      `אפשר גם להשתמש בפקודה של נושא ולקבל אותו מיד`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  private async stopHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const replyText = [
      `סבבה, הפסקנו 🛑`,
      `תגיד לי מתי אתה רוצה לחזור ללמוד ונמשיך`,
      `כשתהיה מוכן, תשלח לי את הפקודה של ההתחלה ונחזור ללמוד`,
      `אתה יכול גם לבקש נושאים כשתרצה בלי תזכורות ממני, תשתמש בפקודה של הנושא`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
    await this.mongoUserPreferencesService.updateUserPreference(chatId, { isStopped: true });
  }

  private async TopicHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const activeTopic = await this.mongoTopicService.getActiveTopic();
    if (activeTopic?._id) {
      await this.mongoTopicService.markTopicCompleted(activeTopic._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => await this.educatorService.startNewTopic(chatId));
  }

  private async addHandler(message: Message) {
    const { chatId } = getMessageData(message);
    const topic = message.text.replace(EDUCATOR_BOT_COMMANDS.ADD.command, '').trim();
    if (!topic?.length) {
      await this.bot.sendMessage(chatId, `אין בעיה אני אוסיף מה שתגיד לי רק תרשום לי בנוסף לפקודה את הנושא`);
      return;
    }
    await this.mongoTopicService.addTopic(topic);
    await this.bot.sendMessage(chatId, `סבבה, הוספתי את זה כנושא`);
  }

  async messageHandler(message: Message) {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(EDUCATOR_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    this.logger.log(`${this.messageHandler.name} - chatId: ${chatId} - start`);

    try {
      const activeTopic = await this.mongoTopicService.getActiveTopic();
      if (!activeTopic) {
        await this.bot.sendMessage(chatId, `אני רואה שאין לך נושא פתוח, אז אני לא מבין על מה לענות. אולי תתחיל נושא חדש?`);
        return;
      }

      const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '🤔' });
      await messageLoaderService.handleMessageWithLoader(async () => {
        await this.educatorService.processQuestion(chatId, text);
      });
      this.logger.log(`${this.messageHandler.name} - chatId: ${chatId} - success`);
    } catch (err) {
      this.logger.error(`${this.messageHandler.name} - chatId: ${chatId} - error - ${getErrorMessage(err)}`);
      await this.bot.sendMessage(chatId, `וואלה מצטער, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`);
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery) {
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
      await this.bot.sendMessage(chatId, `וואלה מצטער, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`);
    }
  }

  private async handleCallbackCompleteTopic(chatId: number, topicId: string) {
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
    const replyText = [`אש 🔥`, `תגיד לי כשאתה מוכן לנושא הבא או שאני פשוט אשלח נושא חדש בפעם הבאה`].join('\n');
    this.bot.sendMessage(chatId, replyText);
  }
}
