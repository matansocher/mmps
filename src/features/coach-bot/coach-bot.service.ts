import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { CoachMongoSubscriptionService, CoachMongoUserService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getDateDescription, getDateString, isDateStringFormat } from '@core/utils';
import { BOTS, getMessageData, MessageLoader, sendStyledMessage, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { registerHandlers } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, COACH_BOT_COMMANDS } from './coach-bot.config';
import { CoachService } from './coach.service';

export const customErrorMessage = 'וואלה מצטער לא יודע מה קרה, אבל קרתה לי בעיה. אפשר לנסות קצת יותר מאוחר 🙁';

@Injectable()
export class CoachBotService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotService.name);

  constructor(
    private readonly mongoUserService: CoachMongoUserService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly coachService: CoachService,
    private readonly notifier: NotifierBotService,
    @Inject(BOTS.COACH.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(COACH_BOT_COMMANDS));

    const { COMMAND, TEXT } = TELEGRAM_EVENTS;
    const { START, STOP, CONTACT } = COACH_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: STOP.command, handler: (message) => this.stopHandler.call(this, message) },
      { event: COMMAND, regex: CONTACT.command, handler: (message) => this.contactHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
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

    this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async stopHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.mongoSubscriptionService.updateSubscription(chatId, false);
    await this.bot.sendMessage(chatId, `סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
    this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
  }

  async contactHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await this.bot.sendMessage(chatId, [`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
    this.notifier.notify(BOTS.COACH, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
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
}
