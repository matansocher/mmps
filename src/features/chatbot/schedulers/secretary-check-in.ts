import type { Bot } from 'grammy';
import { MY_USER_ID, WIFE_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { buildInlineKeyboard } from '@services/telegram';
import { CHECK_IN_MESSAGE, CHECK_IN_SEND_CALLBACK, type SecretaryMessageService } from '../secretary';

const logger = new Logger('chatbot:scheduler:secretary-check-in');

export async function secretaryCheckIn(bot: Bot, messageService: SecretaryMessageService): Promise<void> {
  try {
    if (await messageService.hasSpokenWithChatToday(WIFE_USER_ID)) {
      logger.log('Skipping check-in prompt: already spoke today.');
      return;
    }
    const keyboard = buildInlineKeyboard([{ text: 'Send ✅', data: CHECK_IN_SEND_CALLBACK, style: 'success' }]);
    await bot.api.sendMessage(MY_USER_ID, `Send this to her?\n\n"${CHECK_IN_MESSAGE}"`, { reply_markup: keyboard });
  } catch (err) {
    logger.error(`Failed to send check-in prompt: ${getErrorMessage(err)}`);
  }
}
