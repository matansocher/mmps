import type { Bot } from 'grammy';
import { env } from 'node:process';
import { getDateString, Logger } from '@core/utils';
import { StackerUser } from '@shared/stacker';

export class StackerLauncherService {
  private readonly logger = new Logger(StackerLauncherService.name);

  constructor(private readonly bot: Bot) {}

  async sendLauncher(chatId: number, opts?: { intro?: string }): Promise<void> {
    const url = env.STACKER_MINI_APP_URL;
    if (!url) {
      this.logger.error('STACKER_MINI_APP_URL not configured');
      await this.bot.api.sendMessage(chatId, '⚙️ Stacker is being set up. Try again soon.');
      return;
    }
    const text = opts?.intro ?? '🎯 Tap below to start a round.';
    await this.bot.api.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Play Stacker', web_app: { url } }]] },
    });
  }

  async sendStreakReminder(user: StackerUser): Promise<void> {
    const todayStr = getDateString();
    const lastStr = user.lastPlayedAt ? getDateString(user.lastPlayedAt) : null;
    if (lastStr === todayStr) return;

    const dayDiff = lastStr
      ? Math.round((Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000)
      : Infinity;
    const streakIntact = dayDiff === 1 && user.streakCount > 0;

    const message = streakIntact
      ? `🔥 Your streak is *${user.streakCount} day${user.streakCount === 1 ? '' : 's'}* — don't break it!\n\nOne quick round to keep it alive?`
      : user.streakCount > 0
        ? `💔 Your *${user.streakCount}-day* streak ended.\n\nStart a fresh one with a quick round?`
        : '👋 Ready for a round of programming questions?\n\nBuild a streak by playing daily.';

    await this.bot.api.sendMessage(user.chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: env.STACKER_MINI_APP_URL
        ? { inline_keyboard: [[{ text: '🎯 Play now', web_app: { url: env.STACKER_MINI_APP_URL } }]] }
        : undefined,
    });
  }
}
