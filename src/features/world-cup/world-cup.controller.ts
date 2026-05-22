import { Logger } from '@core/utils';
import type { Context } from 'grammy';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, provideTelegramBot, sendShortenedMessage } from '@services/telegram';
import { upsertUser } from '@shared/world-cup';
import { BOT_CONFIG } from './world-cup.config';
import { LauncherService } from './launcher.service';
import type { WorldCupService } from './world-cup.service';

export class WorldCupController {
  private readonly logger = new Logger(WorldCupController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly worldCupService: WorldCupService) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.command('matches', (ctx) => this.matchesHandler(ctx));
    this.bot.command('leaderboard', (ctx) => this.leaderboardHandler(ctx));
    this.bot.command('help', (ctx) => this.helpHandler(ctx));
    this.bot.on('callback_query', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertUser({
      telegramUserId: userDetails.telegramUserId,
      chatId,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      username: userDetails.username,
      notificationsEnabled: true,
    });

    const keyboard = buildInlineKeyboard([
      { text: '⚽ משחקים קרובים', data: 'matches' },
      { text: '🏆 טבלת דירוג', data: 'leaderboard' },
      { text: '📱 פתח אפליקציה', data: 'open_app' },
    ]);

    await ctx.reply(
      `ברוכים הבאים למשחק הניחושים של מונדיאל 2026! ⚽🏆\n\nנחשו תוצאות ותתחרו מול חברים.\n\n• 5 נק׳ — תוצאה מדויקת\n• 3 נק׳ — תוצאה נכונה + הפרש שערים\n• 1 נק׳ — תוצאה נכונה בלבד\n• 0 נק׳ — ניחוש שגוי\n\nהשתמשו באפליקציה לחוויה המלאה!`,
      { reply_markup: keyboard },
    );
  }

  private async matchesHandler(ctx: Context): Promise<void> {
    const text = await this.worldCupService.getUpcomingMatchesText();
    await sendShortenedMessage(this.bot, getMessageData(ctx).chatId, text);
  }

  private async leaderboardHandler(ctx: Context): Promise<void> {
    const text = await this.worldCupService.getLeaderboardText();
    await sendShortenedMessage(this.bot, getMessageData(ctx).chatId, text);
  }

  private async helpHandler(ctx: Context): Promise<void> {
    await ctx.reply(
      `פקודות הבוט:\n\n/start — הרשמה והודעת פתיחה\n/matches — משחקים קרובים\n/leaderboard — טבלת דירוג\n/help — עזרה\n\nלחצו על כפתור האפליקציה כדי לשלוח ניחושים ולראות סטטיסטיקות!`,
    );
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { data, chatId } = getCallbackQueryData(ctx);
    await ctx.answerCallbackQuery();

    switch (data) {
      case 'matches': {
        const text = await this.worldCupService.getUpcomingMatchesText();
        await sendShortenedMessage(this.bot, chatId, text);
        break;
      }
      case 'leaderboard': {
        const text = await this.worldCupService.getLeaderboardText();
        await sendShortenedMessage(this.bot, chatId, text);
        break;
      }
      case 'open_app': {
        const launcher = new LauncherService();
        await ctx.reply('לחצו למטה לפתיחת האפליקציה:', { reply_markup: launcher.getWebAppKeyboard() });
        break;
      }
    }
  }
}
