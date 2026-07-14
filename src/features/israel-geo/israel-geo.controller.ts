import type { Bot, Context } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';

export class IsraelGeoController {
  private readonly logger = new Logger(IsraelGeoController.name);

  constructor(private readonly bot: Bot) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const url = env.ISRAEL_GEO_MINI_APP_URL;
    if (!url) {
      this.logger.warn('ISRAEL_GEO_MINI_APP_URL not configured');
      await ctx.reply('Israel Geo is not configured yet. Try again later.');
      return;
    }
    await ctx.reply('🧭 Ready to explore Israel?', {
      reply_markup: { inline_keyboard: [[{ text: '🇮🇱 Open Israel Geo', web_app: { url } }]] },
    });
  }
}
