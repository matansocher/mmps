import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MY_USER_NAME } from '@core/config';
import { WorldlyMongoGameLogService, WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, reactToMessage, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { generateSpecialMessage, generateStatisticsMessage, getCountryByCapital, getCountryByName, getStateByName } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './worldly.config';
import { WorldlyService } from './worldly.service';

const customErrorMessage = 'אופס, קרתה לי תקלה, אבל אפשר לנסות שוב מאוחר יותר 🙁';

@Injectable()
export class WorldlyController implements OnModuleInit {
  private readonly logger = new Logger(WorldlyController.name);
  private readonly botToken: string;

  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly userDB: WorldlyMongoUserService,
    private readonly subscriptionDB: WorldlyMongoSubscriptionService,
    private readonly gameLogDB: WorldlyMongoGameLogService,
    private readonly notifier: NotifierService,
    private readonly configService: ConfigService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {
    this.botToken = getBotToken(BOT_CONFIG.id, this.configService.get(BOT_CONFIG.token));
  }

  onModuleInit(): void {
    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, RANDOM, MAP, US_MAP, FLAG, CAPITAL, ACTIONS } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: RANDOM.command, handler: (message) => this.randomHandler.call(this, message) },
      { event: COMMAND, regex: MAP.command, handler: (message) => this.mapHandler.call(this, message) },
      { event: COMMAND, regex: US_MAP.command, handler: (message) => this.USMapHandler.call(this, message) },
      { event: COMMAND, regex: FLAG.command, handler: (message) => this.flagHandler.call(this, message) },
      { event: COMMAND, regex: CAPITAL.command, handler: (message) => this.capitalHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const subscription = await this.subscriptionDB.getSubscription(chatId);
    const inlineKeyboardButtons = [
      { text: '📊 סטטיסטיקות 📊', callback_data: `${BOT_ACTIONS.STATISTICS}` },
      !subscription?.isActive
        ? { text: '🟢 רוצה להתחיל לקבל משחקים יומיים 🟢', callback_data: `${BOT_ACTIONS.START}` }
        : { text: '🛑 רוצה להפסיק לקבל משחקים יומיים 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, 'איך אני יכול לעזור? 👨‍🏫', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch();
  }

  async randomHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      await this.worldlyService.randomGameHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.RANDOM }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: 'RANDOM', error: `${err}` }, userDetails);
      throw err;
    }
  }

  async mapHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      await this.worldlyService.mapHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MAP }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.MAP, error: `${err}` }, userDetails);
      throw err;
    }
  }

  async USMapHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      await this.worldlyService.USMapHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.US_MAP }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.US_MAP, error: `${err}` }, userDetails);
      throw err;
    }
  }

  async flagHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      await this.worldlyService.flagHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FLAG }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.FLAG, error: `${err}` }, userDetails);
      throw err;
    }
  }

  async capitalHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    try {
      await this.worldlyService.capitalHandler(chatId);
      this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CAPITAL }, userDetails);
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: BOT_ACTIONS.CAPITAL, error: `${err}` }, userDetails);
      throw err;
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [action, selectedName, correctName] = response.split(' - ');
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
        case BOT_ACTIONS.STATISTICS:
          await this.statisticsHandler(chatId);
          await this.bot.deleteMessage(chatId, messageId).catch();
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STATISTICS }, userDetails);
          break;
        case BOT_ACTIONS.MAP:
          await this.mapAnswerHandler(chatId, messageId, selectedName, correctName);
          await this.gameLogDB.saveGameLog(chatId, ANALYTIC_EVENT_NAMES.MAP, correctName, selectedName);
          this.notifier.notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        case BOT_ACTIONS.US_MAP:
          await this.USMapAnswerHandler(chatId, messageId, selectedName, correctName);
          await this.gameLogDB.saveGameLog(chatId, ANALYTIC_EVENT_NAMES.US_MAP, correctName, selectedName);
          this.notifier.notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🇺🇸 🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        case BOT_ACTIONS.FLAG:
          await this.flagAnswerHandler(chatId, messageId, selectedName, correctName);
          await this.gameLogDB.saveGameLog(chatId, ANALYTIC_EVENT_NAMES.FLAG, correctName, selectedName);
          this.notifier.notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏁', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        case BOT_ACTIONS.CAPITAL:
          await this.capitalAnswerHandler(chatId, messageId, selectedName, correctName);
          await this.gameLogDB.saveGameLog(chatId, ANALYTIC_EVENT_NAMES.CAPITAL, correctName, selectedName);
          this.notifier.notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏛️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        default:
          this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
          throw new Error('Invalid action');
      }

      if (![BOT_ACTIONS.MAP, BOT_ACTIONS.US_MAP, BOT_ACTIONS.FLAG, BOT_ACTIONS.CAPITAL].includes(action)) {
        return;
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
      'אני בוט שיודע ללמד משחקי גיאוגרפיה בצורה הכי כיפית שיש 😁',
      'כל יום אני אשלח לכם כמה משחקים 🌎',
      'אפשר גם להתחיל משחק חדש מתי שרוצים בפקודות שלי, פה למטה 👇',
      `אם אתם רוצים שאני אפסיק לשלוח משחקים בכל יום, אפשר פשוט לבקש ממני בפקודה ׳פעולות׳, פה למטה 👇`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אשלח משחקים בכל יום 🟢`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.subscriptionDB.updateSubscription(chatId, { isActive: false });
    await this.bot.sendMessage(chatId, `אין בעיה, אני אפסיק לשלוח משחקים בכל יום 🛑`);
  }

  private async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, ['אשמח לעזור', 'אפשר לדבר עם מי שיצר אותי, הוא בטח ידע לעזור', MY_USER_NAME].join('\n'));
  }

  private async statisticsHandler(chatId: number): Promise<void> {
    const userGameLogs = await this.gameLogDB.getUserGameLogs(chatId);
    if (!userGameLogs?.length) {
      await this.bot.sendMessage(chatId, 'אני רואה שעדיין לא שיחנו ביחד משחקים, אפשר להתחיל משחק חדש בפקודה ׳משחק אקראי׳ או בפקודה ׳מפה׳');
      return;
    }

    const replyText = generateStatisticsMessage(userGameLogs);
    await this.bot.sendMessage(chatId, replyText);
  }

  private async mapAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji}`;
    await this.bot.editMessageCaption(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.botToken, chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }

  private async USMapAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId });
    const correctCountry = getStateByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctCountry.hebrewName}`;
    await this.bot.editMessageCaption(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.botToken, chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }

  private async flagAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji}`;
    await this.bot.editMessageText(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.botToken, chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }

  private async capitalAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByCapital(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} - עיר הבירה של ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji} היא ${correctCountry.hebrewCapital}`;
    await this.bot.editMessageText(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.botToken, chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }
}
