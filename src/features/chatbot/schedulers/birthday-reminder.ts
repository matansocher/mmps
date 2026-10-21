import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayEvents } from '@shared/calendar-events';
import type { ChatbotService } from '../chatbot.service';
import { buildBirthdayKeyboard } from './birthday-actions';

const logger = new Logger('chatbot:scheduler:birthday-reminder');

export async function birthdayReminder(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const events = await getTodayEvents();
    const birthdays = events.filter((event) => event.start.date && event.summary.toLowerCase().includes('birthday'));

    if (!birthdays.length) {
      return;
    }

    const lines = birthdays.map((event) => `🎂 ${event.summary}`).join('\n');
    const message = `🎉 Birthday reminder!\n\n${lines}\n\nDon't forget to congratulate!`;
    await sendShortenedMessage(bot, MY_USER_ID, message, {
      parse_mode: 'Markdown',
      reply_markup: buildBirthdayKeyboard(),
    });
    await chatbotService.recordProactiveMessage(MY_USER_ID, message, 'birthday-reminder');
  } catch (err) {
    logger.error(`Failed to send birthday reminder: ${getErrorMessage(err)}`);
  }
}
