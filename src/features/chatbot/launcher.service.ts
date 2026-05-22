import type { Bot } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';

export class ChatbotLauncherService {
  private readonly logger = new Logger(ChatbotLauncherService.name);

  constructor(private readonly bot: Bot) {}

  buildKeyboard(): { inline_keyboard: { text: string; web_app: { url: string } }[][] } | null {
    const url = env.CHATBOT_MINI_APP_URL;
    if (!url) {
      this.logger.warn('CHATBOT_MINI_APP_URL not configured');
      return null;
    }
    return { inline_keyboard: [[{ text: '📱 Open app', web_app: { url } }]] };
  }

  async sendLauncher(chatId: number, intro = '🤖 Here is the app:'): Promise<void> {
    const reply_markup = this.buildKeyboard();
    if (!reply_markup) {
      await this.bot.api.sendMessage(chatId, 'The app is not configured yet. Try again later.');
      return;
    }
    await this.bot.api.sendMessage(chatId, intro, { reply_markup });
  }
}
