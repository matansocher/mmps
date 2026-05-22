import { env } from 'node:process';
import { Logger } from '@core/utils';

export class LauncherService {
  private readonly logger = new Logger(LauncherService.name);

  getWebAppKeyboard(): { inline_keyboard: { text: string; web_app: { url: string } }[][] } | null {
    const url = env.WORLD_CUP_MINI_APP_URL;
    if (!url) {
      this.logger.warn('WORLD_CUP_MINI_APP_URL not configured');
      return null;
    }
    return { inline_keyboard: [[{ text: '📱 Open Mini App', web_app: { url } }]] };
  }
}
