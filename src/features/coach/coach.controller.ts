import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierService } from '@core/notifier';
import { getDateDescription, getDateString, isDateStringFormat } from '@core/utils';
import { getCompetitions } from '@services/scores-365';
import {
  BOTS,
  getCallbackQueryData,
  getInlineKeyboardMarkup,
  getMessageData,
  MessageLoader,
  registerHandlers,
  sendStyledMessage,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, COACH_BOT_COMMANDS } from './coach.config';
import { CoachService } from './coach.service';

const customErrorMessage = 'וואלה מצטער לא יודע מה קרה, אבל קרתה לי בעיה. אפשר לנסות קצת יותר מאוחר 🙁';

@Injectable()
export class CoachController implements OnModuleInit {
  private readonly logger = new Logger(CoachController.name);

  constructor(
    private readonly mongoUserService: CoachMongoUserService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly coachService: CoachService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.COACH.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(COACH_BOT_COMMANDS));

    const { COMMAND, TEXT, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { TABLES, MATCHES, ACTIONS } = COACH_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: TABLES.command, handler: (message) => this.tablesHandler.call(this, message) },
      { event: COMMAND, regex: MATCHES.command, handler: (message) => this.matchesHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async tablesHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const competitions = await getCompetitions();
    const competitionsWithTables = competitions.filter((competition) => competition.hasTable);
    const inlineKeyboardButtons = competitionsWithTables.map((competition) => {
      const { id, name, icon } = competition;
      return { text: `${icon} ${name} ${icon}`, callback_data: `${BOT_ACTIONS.TABLE} - ${id}` };
    });
    await this.bot.sendMessage(chatId, 'לאיזה ליגה?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons, 2) as any) });
  }

  private async matchesHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const competitions = await getCompetitions();
    const inlineKeyboardButtons = competitions.map((competition) => {
      const { id, name, icon } = competition;
      return { text: `${icon} ${name} ${icon}`, callback_data: `${BOT_ACTIONS.MATCH} - ${id}` };
    });
    await this.bot.sendMessage(chatId, 'לאיזה ליגה?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons, 2) as any) });
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    const inlineKeyboardButtons = [
      !subscription?.isActive ? { text: '🟢 התחל לקבל עדכונים יומיים 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 הפסק לקבל עדכונים יומיים 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👨‍🏫 איך אני יכול לעזור?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons) as any) });
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(COACH_BOT_COMMANDS).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, chatId, { loaderEmoji: '⚽️' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const date = isDateStringFormat(text) ? text : getDateString();
      const resultText = await this.coachService.getMatchesSummaryMessage(date);
      if (!resultText) {
        await this.bot.sendMessage(chatId, `וואלה לא מצאתי אף משחק בתאריך הזה 😔`);
        return;
      }
      const datePrefix = `זה המצב הנוכחי של המשחקים בתאריך: ${getDateDescription(new Date(date))}`;
      const replyText = [datePrefix, resultText].join('\n\n');
      await sendStyledMessage(this.bot, chatId, replyText);
    });

    this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.SEARCH, text }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, userDetails, data: response } = getCallbackQueryData(callbackQuery);

    const [action, resource] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.START:
        await this.startHandler(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.TABLE:
        await this.tableHandler(chatId, Number(resource));
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.TABLE }, userDetails);
        break;
      case BOT_ACTIONS.MATCH:
        await this.competitionMatchesHandler(chatId, Number(resource));
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.MATCH }, userDetails);
        break;
      default:
        this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async startHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const userExists = await this.mongoUserService.saveUserDetails(userDetails);

    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    subscription ? await this.mongoSubscriptionService.updateSubscription(chatId, true) : await this.mongoSubscriptionService.addSubscription(chatId);

    const newUserReplyText = [
      `שלום 👋`,
      `אני פה כדי לתת תוצאות של משחקי ספורט`,
      `כדי לראות תוצאות של משחקים מהיום נכון לעכשיו, אפשר פשוט לשלוח לי הודעה, כל הודעה`,
      `כדי לראות תוצאות מיום אחר, אפשר לשלוח לי את התאריך שרוצים בפורמט (2025-03-17) הזה ואני אשלח תוצאות רלוונטיות לאותו יום`,
      `אם תרצה להפסיק לקבל ממני עדכונים, תוכל להשתמש בפקודה פה למטה`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אתריע לך ⚽️🏀`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.mongoSubscriptionService.updateSubscription(chatId, false);
    await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
  }

  async tableHandler(chatId: number, competitionId: number): Promise<void> {
    const resultText = await this.coachService.getCompetitionTableMessage(competitionId);
    await this.bot.sendMessage(chatId, resultText);
  }

  async competitionMatchesHandler(chatId: number, competitionId: number): Promise<void> {
    const resultText = await this.coachService.getCompetitionMatchesMessage(competitionId);
    await sendStyledMessage(this.bot, chatId, resultText);
  }
}
