import type { Bot, Context } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';

export class LearnerController {
  private readonly logger = new Logger(LearnerController.name);

  constructor(private readonly bot: Bot) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const url = env.LEARNER_MINI_APP_URL;
    if (!url) {
      this.logger.warn('LEARNER_MINI_APP_URL not configured');
      await ctx.reply('The Learner app is not configured yet. Try again later.');
      return;
    }
    await ctx.reply('🎓 Your AI engineering courses are ready:', {
      reply_markup: { inline_keyboard: [[{ text: '📚 Open Learner', web_app: { url } }]] },
    });
  }
}
