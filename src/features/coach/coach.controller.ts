import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MY_USER_NAME } from '@core/config';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierService } from '@core/notifier';
import { getDateDescription, getDateString, isDateStringFormat } from '@core/utils';
import { COMPETITION_IDS_MAP, getCompetitions } from '@services/scores-365';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

const loaderMessage = '⚽️ אני אוסף את כל התוצאות, שניה אחת...';
const customErrorMessage = 'וואלה מצטער לא יודע מה קרה, אבל קרתה לי בעיה. אפשר לנסות קצת יותר מאוחר 🙁';

@Injectable()
export class CoachController implements OnModuleInit {
  private readonly logger = new Logger(CoachController.name);
  private readonly botToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mongoUserService: CoachMongoUserService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly coachService: CoachService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {
    this.botToken = this.configService.get(BOT_CONFIG.token);
  }

  onModuleInit(): void {
    const { COMMAND, TEXT, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, TABLES, MATCHES, ACTIONS } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: TABLES.command, handler: (message) => this.tablesHandler.call(this, message) },
      { event: COMMAND, regex: MATCHES.command, handler: (message) => this.matchesHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
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
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const date = isDateStringFormat(text) ? text : getDateString();
      const resultText = await this.coachService.getMatchesSummaryMessage(date);
      if (!resultText) {
        await this.bot.sendMessage(chatId, `וואלה לא מצאתי אף משחק בתאריך הזה 😔`);
        return;
      }
      const datePrefix = `זה המצב הנוכחי של המשחקים בתאריך: ${getDateDescription(new Date(date))}`;
      const replyText = [datePrefix, resultText].join('\n\n');
      await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, text }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, userDetails, data: response } = getCallbackQueryData(callbackQuery);

    const [action, resource] = response.split(' - ');
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
      case BOT_ACTIONS.TABLE:
        await this.tableHandler(chatId, Number(resource));
        await this.bot.deleteMessage(chatId, messageId).catch();
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TABLE }, userDetails);
        break;
      case BOT_ACTIONS.MATCH:
        await this.competitionMatchesHandler(chatId, Number(resource));
        await this.bot.deleteMessage(chatId, messageId).catch();
        const leagueName = Object.entries(COMPETITION_IDS_MAP)
          .filter(([_, value]) => value === parseInt(resource))
          .map(([key]) => key)[0];
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MATCH, league: leagueName }, userDetails);
        break;
      default:
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, reason: 'invalid action', response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
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
    await this.bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });
  }

  async competitionMatchesHandler(chatId: number, competitionId: number): Promise<void> {
    const resultText = await this.coachService.getCompetitionMatchesMessage(competitionId);
    if (!resultText) {
      await this.bot.sendMessage(chatId, 'לא מצאתי משחקים בליגה הזאת 😔');
      return;
    }
    await this.bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });
  }
}
