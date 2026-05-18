import type { Bot } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';

export class WorldlyLauncherService {
  private readonly logger = new Logger(WorldlyLauncherService.name);

  constructor(private readonly bot: Bot) {}

  buildKeyboard(): { inline_keyboard: { text: string; web_app: { url: string } }[][] } | null {
    const url = env.WORLDLY_MINI_APP_URL;
    if (!url) {
      this.logger.warn('WORLDLY_MINI_APP_URL not configured');
      return null;
    }
    return { inline_keyboard: [[{ text: '📱 פתח אפליקציה', web_app: { url } }]] };
  }

  async sendLauncher(chatId: number, intro = '🌍 הנה האפליקציה:'): Promise<void> {
    const reply_markup = this.buildKeyboard();
    if (!reply_markup) {
      await this.bot.api.sendMessage(chatId, 'האפליקציה עוד לא מוכנה. נסה שוב בקרוב.');
      return;
    }
    await this.bot.api.sendMessage(chatId, intro, { reply_markup });
  }
}
