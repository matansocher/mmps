import type { Bot } from 'grammy';
import { InputFile } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { generateWcTreeImage } from '@services/wc-tree';

const logger = new Logger('WcTreeUpdateScheduler');

export async function wcTreeUpdate(bot: Bot): Promise<void> {
  try {
    const { path, placedCount } = await generateWcTreeImage();

    if (placedCount === 0) {
      logger.log('No qualified teams yet — skipping World Cup tree update');
      return;
    }

    await bot.api.sendPhoto(MY_USER_ID, new InputFile(path), { caption: '🏆 גביע העולם 2026 — עץ הנוקאאוט המעודכן' });
    logger.log(`Sent World Cup tree update with ${placedCount} placed teams`);
  } catch (err) {
    logger.error(`Failed to send World Cup tree update: ${err}`);
  }
}
