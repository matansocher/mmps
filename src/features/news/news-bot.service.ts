import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { NewsMongoAnalyticLogService, NewsMongoSubscriptionService, NewsMongoUserService } from '@core/mongo/news-mongo';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import { NewsService } from '@services/news';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { IChannelDetails } from '@services/telegram-client';
import { INITIAL_BOT_RESPONSE, ANALYTIC_EVENT_NAMES, GENERAL_ERROR_MESSAGE, SUBSCRIBE_MESSAGE, UNSUBSCRIBE_MESSAGE } from './news-bot.config';

@Injectable()
export class NewsBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly newsService: NewsService,
    private readonly mongoUserService: NewsMongoUserService,
    private readonly mongoAnalyticLogService: NewsMongoAnalyticLogService,
    private readonly mongoSubscriptionService: NewsMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.NEWS.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();

    // for testing purposes
    // this.createFakeNews();
  }

  // async createFakeNews() {
  //   const messages = [
  //     `צה״ל תקף הלילה את הבסיס המרכזי של היחידה הימית של חיזבאללה במהלך הלילה מטוסי קרב של חיל האוויר, תקפו את הבסיס המרכזי של היחידה הימית של ארגון הטרור חיזבאללה בביירות. הבסיס שימש את היחידה כמוקד פעילות מרכזי של הארגון: אחסון כלי שיט מהירים, ניהול ניסויים והדרכות לכוח הימי. כלי השיט של היחידה נועדו לפגיעה בכלי שיט של חיל הים ובמטרות ימיות ואסטרטגיות במרחב הימי של ישראל.`,
  //     `זמן קצר לפני תחילת התקיפות בדאחיה בביירות, דובר צה"ל בערבית, אל״ם אביחי אדרעי, פרסם הודעת פינוי למספר מבנים, ביניהם בניין שבו התקיימה מסיבת עיתונאים של ארגון הטרור חיזבאללה. בעקבות כך, מסיבת העיתונאים נקטעה באמצע.`,
  //     `דובר החות׳ים טוען כי הם שיגרו טיל בליסטי לעבר יעד צבאי באזור תל אביב - לטענתו הטיל הגיע ליעדו בהצלחה. דובר צה״ל עד כה לא התייחס לאירוע.`,
  //     `מצורף תיעוד נוסף מבית משפחת נתניהו בקיסריה שנפגע בשבת האחרונה מכטב״ם ששיגר ארגון הטרור חיזבאללה.`,
  //     `תיעוד מרגע מעצרם של שלושה מחברי החוליה שפעלו בשירות האיראנים ותכננו לבצע התנקשות במדען ישראלי בכיר וראש עירייה של עיר גדולה בישראל, המעצר התרחש לפני כחודש ע"י צוות טקילה של השב"כ.`,
  //     `דובר צה״ל: לפני כשעה זוהה כלי טיס בלתי מאויש במרחב ראש הנקרה, הכלי עשה את דרכו לכיוון מרחב יקנעם והיה תחת מעקב חיל האויר. התרעות באיזורים נוספים הופעלו על פי מדיניות התרעות על מנת להבטיח את ביטחונם של האזרחים. פיקוד העורף הודיע על סיום הארוע. נמשך מאמץ לאיתור כלי הטיס, שככל הנראה נפל בשטח פתוח.`,
  //     `תושבים במרכז הארץ מדווחים על הדף שהורגש - הפרטים נמצאים בבדיקה.`,
  //     `צה"ל חיסל את ראש המועצה המבצעת של ארגון הטרור חיזבאללה, ובן דודו של נסראללה, האשם צפי אלדין`,
  //   ];
  //   for (const message of messages) {
  //     await this.newsService.handleFakeMessage(message);
  //     await new Promise((resolve) => setTimeout(resolve, 3000));
  //   }
  // }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NEWS.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.NEWS.name, 'error', error));
  }

  createBotEventListeners() {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/channels/, (message: Message) => this.channelsHandler(message));
    this.bot.onText(/\/subscribe/, (message: Message) => this.subscribeHandler(message));
    this.bot.onText(/\/unsubscribe/, (message: Message) => this.unsubscribeHandler(message));
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{firstName}', firstName || username || '');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      this.notifierBotService.notify(BOTS.NEWS.name, { action: ANALYTIC_EVENT_NAMES.START }, chatId, this.mongoUserService);
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, GENERAL_ERROR_MESSAGE);
    }
  }

  async channelsHandler(message: Message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `show :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.channelsHandler.name, `${logBody} - start`);

    try {
      const channelsDetails = await this.newsService.getChannelsDetails();

      if (!channelsDetails?.length) {
        const replyText = `לא הצלחתי למצוא את הערוצים, נראה שיש בעיה עכשיו`;
        return await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      }

      const channelNames = channelsDetails.map((channelDetails: IChannelDetails) => channelDetails.title).join('\n');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `הנה כל הערוצים שאני עוקב אחריהם:\n\n${channelNames}`);
      this.logger.info(this.channelsHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.channelsHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, GENERAL_ERROR_MESSAGE);
    }
  }

  async subscribeHandler(message: Message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `subscribe :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.subscribeHandler.name, `${logBody} - start`);

    try {
      await this.mongoSubscriptionService.subscribeChat(chatId);

      await this.telegramGeneralService.sendMessage(this.bot, chatId, SUBSCRIBE_MESSAGE);
      this.notifierBotService.notify(BOTS.NEWS.name, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE }, chatId, this.mongoUserService);
      this.logger.info(this.subscribeHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.subscribeHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, GENERAL_ERROR_MESSAGE);
    }
  }

  async unsubscribeHandler(message: Message) {
    const { chatId, firstName, lastName } = this.telegramGeneralService.getMessageData(message);
    const logBody = `unsubscribe :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;
    this.logger.info(this.unsubscribeHandler.name, `${logBody} - start`);

    try {
      await this.mongoSubscriptionService.unsubscribeChat(chatId);

      await this.telegramGeneralService.sendMessage(this.bot, chatId, UNSUBSCRIBE_MESSAGE);
      this.notifierBotService.notify(BOTS.NEWS.name, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE }, chatId, this.mongoUserService);
      this.logger.info(this.unsubscribeHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.unsubscribeHandler.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, GENERAL_ERROR_MESSAGE);
    }
  }
}
