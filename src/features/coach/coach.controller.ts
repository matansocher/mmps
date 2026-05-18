import type { Bot, Context } from 'grammy';
import { MY_USER_NAME } from '@core/config';
import { Logger } from '@core/utils';
import { getDateDescription } from '@core/utils';
import { notify } from '@services/notifier';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, MessageLoader, UserDetails } from '@services/telegram';
import { addSubscription, getSubscription, saveUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';
import { CoachLauncherService } from './launcher.service';
import { getDateFromUserInput } from './utils';

const loaderMessage = '⚽️ אני אוסף את כל התוצאות, שניה אחת...';

const getKeyboardOptions = () => {
  return {
    reply_markup: {
      keyboard: BOT_CONFIG.keyboardOptions.map((option) => {
        return [{ text: option }];
      }),
      resize_keyboard: true,
    },
  };
};

export class CoachController {
  private readonly logger = new Logger(CoachController.name);

  constructor(
    private readonly coachService: CoachService,
    private readonly bot: Bot,
    private readonly launcher: CoachLauncherService,
  ) {}

  init(): void {
    const { START, TABLES, MATCHES, ACTIONS } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(TABLES.command.replace('/', ''), (ctx) => this.tablesHandler(ctx));
    this.bot.command(MATCHES.command.replace('/', ''), (ctx) => this.matchesHandler(ctx));
    this.bot.command(ACTIONS.command.replace('/', ''), (ctx) => this.actionsHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await this.userStart(ctx, chatId, userDetails);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async tablesHandler(ctx: Context): Promise<void> {
    const competitions = await this.coachService.getCompetitions();
    const competitionsWithTables = competitions.filter((competition) => competition.hasTable);
    const keyboard = buildInlineKeyboard(
      competitionsWithTables.map((competition) => {
        const { id, name, icon } = competition;
        return { text: `${icon} ${name} ${icon}`, data: `${BOT_ACTIONS.TABLE} - ${id}`, style: 'primary' as const };
      }),
      2,
    );
    await ctx.reply('לאיזה ליגה?', { reply_markup: keyboard });
  }

  private async matchesHandler(ctx: Context): Promise<void> {
    const competitions = await this.coachService.getCompetitions();
    const keyboard = buildInlineKeyboard(
      competitions.map((competition) => {
        const { id, name, icon } = competition;
        return { text: `${icon} ${name} ${icon}`, data: `${BOT_ACTIONS.MATCH} - ${id}`, style: 'primary' as const };
      }),
      2,
    );
    await ctx.reply('לאיזה ליגה?', { reply_markup: keyboard });
  }

  private async actionsHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const subscription = await getSubscription(chatId);
    const keyboard = buildInlineKeyboard([
      { text: '⚽️ הגדרת ליגות למעקב ⚽️', data: `${BOT_ACTIONS.CUSTOM_LEAGUES}`, style: 'primary' },
      !subscription?.isActive
        ? { text: '🟢 התחל לקבל עדכונים יומיים 🟢', data: `${BOT_ACTIONS.START}`, style: 'success' as const }
        : { text: '🛑 הפסק לקבל עדכונים יומיים 🛑', data: `${BOT_ACTIONS.STOP}`, style: 'danger' as const },
      { text: '📬 צור קשר 📬', data: `${BOT_ACTIONS.CONTACT}` },
    ]);
    await ctx.reply('👨‍🏫 איך אני יכול לעזור?', { reply_markup: keyboard });
    const launcherKeyboard = this.launcher.buildKeyboard();
    if (launcherKeyboard) {
      await this.bot.api.sendMessage(chatId, '📱 או פתח את האפליקציה', { reply_markup: launcherKeyboard });
    }
    await ctx.deleteMessage().catch(() => {});
  }

  private async textHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { loaderMessage, reactionEmoji: '👀' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const date = getDateFromUserInput(text);
      const subscription = await getSubscription(chatId);
      const resultText = await this.coachService.getMatchesSummaryMessage(date, subscription.customLeagues);
      if (!resultText) {
        await ctx.reply(`וואלה לא מצאתי אף משחק בתאריך הזה 😔`, { ...getKeyboardOptions() });
        return;
      }
      const datePrefix = `זה המצב הנוכחי של המשחקים בתאריך: ${getDateDescription(new Date(date))}`;
      const replyText = [datePrefix, resultText].join('\n\n');
      await ctx.reply(replyText, { parse_mode: 'Markdown', ...getKeyboardOptions() });
    });

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, text }, userDetails);
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails, data: response } = getCallbackQueryData(ctx);

    const [action, resource, subAction] = response.split(' - ');
    try {
      switch (action) {
        case BOT_ACTIONS.START:
          await this.userStart(ctx, chatId, userDetails);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
          break;
        case BOT_ACTIONS.STOP:
          await this.stopHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
          break;
        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(ctx);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
          break;
        case BOT_ACTIONS.TABLE:
          await this.tableHandler(ctx, Number(resource));
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TABLE }, userDetails);
          break;
        case BOT_ACTIONS.MATCH: {
          await this.competitionMatchesHandler(ctx, Number(resource));
          await ctx.deleteMessage().catch(() => {});
          const leagueName = Object.entries(COMPETITION_IDS_MAP)
            .filter(([, value]) => value === Number(resource))
            .map(([key]) => key)[0];
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MATCH, league: leagueName }, userDetails);
          break;
        }
        case BOT_ACTIONS.CUSTOM_LEAGUES:
          await this.customLeaguesHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CUSTOM_LEAGUES }, userDetails);
          break;
        case BOT_ACTIONS.CUSTOM_LEAGUES_SELECT:
          await this.customLeaguesSelectHandler(ctx, chatId, Number(resource), Number(subAction));
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CUSTOM_LEAGUES_SELECT }, userDetails);
          break;
        default:
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, reason: 'invalid action', response }, userDetails);
          throw new Error('Invalid action');
      }

      await ctx.answerCallbackQuery().catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling callback query, ${err}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true });
    }
  }

  private async userStart(ctx: Context, chatId: number, userDetails: UserDetails): Promise<void> {
    const userExists = await saveUserDetails(userDetails);

    const subscription = await getSubscription(chatId);
    if (subscription) {
      await updateSubscription(chatId, { isActive: true });
    } else {
      await addSubscription(chatId);
    }

    const newUserReplyText = [
      `שלום 👋`,
      `אני פה כדי לתת תוצאות של משחקי ספורט`,
      `כדי לראות תוצאות של משחקים מהיום נכון לעכשיו, אפשר פשוט לשלוח לי הודעה, כל הודעה`,
      `כדי לראות תוצאות מיום אחר, אפשר לשלוח לי את התאריך שרוצים בפורמט (2025-03-17) הזה ואני אשלח תוצאות רלוונטיות לאותו יום`,
      `אם תרצה להפסיק לקבל ממני עדכונים, תוכל להשתמש בפקודה פה למטה`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אתריע לך ⚽️🏀`;
    await ctx.reply(userExists ? existingUserReplyText : newUserReplyText, { ...getKeyboardOptions() });
    const launcherKeyboard = this.launcher.buildKeyboard();
    if (launcherKeyboard) {
      await this.bot.api.sendMessage(chatId, '📱 גם יש לי אפליקציה — לתצוגה ויזואלית:', { reply_markup: launcherKeyboard });
    }
  }

  private async stopHandler(ctx: Context, chatId: number): Promise<void> {
    await updateSubscription(chatId, { isActive: false });
    await ctx.reply(`סבבה, אני מפסיק לשלוח לך עדכונים יומיים 🛑`);
  }

  private async contactHandler(ctx: Context): Promise<void> {
    await ctx.reply([`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
  }

  private async tableHandler(ctx: Context, competitionId: number): Promise<void> {
    const resultText = await this.coachService.getCompetitionTableMessage(competitionId);
    await ctx.reply(resultText, { parse_mode: 'Markdown', ...getKeyboardOptions() });
  }

  private async competitionMatchesHandler(ctx: Context, competitionId: number): Promise<void> {
    const resultText = await this.coachService.getCompetitionMatchesMessage(competitionId);
    if (!resultText) {
      await ctx.reply('לא מצאתי משחקים בליגה הזאת 😔', { ...getKeyboardOptions() });
      return;
    }
    await ctx.reply(resultText, { parse_mode: 'Markdown', ...getKeyboardOptions() });
  }

  private async customLeaguesHandler(ctx: Context, chatId: number): Promise<void> {
    const [subscription, competitions] = await Promise.all([getSubscription(chatId), this.coachService.getCompetitions()]);
    const userCustomLeagues = subscription?.customLeagues || [];

    const keyboard = buildInlineKeyboard(
      competitions.map((competition) => {
        const { id, name } = competition;
        const isFollowing = userCustomLeagues.includes(id) || userCustomLeagues.length === 0;
        const actionIcon = isFollowing ? 'הסר ✅' : 'עקוב ❌';
        const subAction = isFollowing ? 0 : 1;
        return { text: `${name} - ${actionIcon}`, data: `${BOT_ACTIONS.CUSTOM_LEAGUES_SELECT} - ${id} - ${subAction}`, style: (isFollowing ? 'success' : 'danger') as 'success' | 'danger' };
      }),
    );

    await ctx.reply('כאן אפשר להגדיר אחרי איזה ליגות לעקוב', { reply_markup: keyboard });
  }

  private async customLeaguesSelectHandler(ctx: Context, chatId: number, competitionId: number, subAction: number): Promise<void> {
    const subscription = await getSubscription(chatId);
    const userCustomLeagues = subscription?.customLeagues || [];

    if (!userCustomLeagues.length) {
      userCustomLeagues.push(...Object.values(COMPETITION_IDS_MAP));
    }

    if (subAction) {
      if (!userCustomLeagues.includes(competitionId)) {
        userCustomLeagues.push(competitionId);
      }
    } else {
      const index = userCustomLeagues.indexOf(competitionId);
      if (index > -1) {
        userCustomLeagues.splice(index, 1);
      }
    }
    await updateSubscription(chatId, { customLeagues: [...new Set(userCustomLeagues)] });

    await ctx.reply('מעולה, עדכנתי את הליגות שלך 💪\nאפשר להוסיף או להסיר ליגות נוספות');
  }
}
