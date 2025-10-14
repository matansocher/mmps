import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getTodayExercise } from '@shared/trainer';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('ExerciseReminderScheduler');

export async function exerciseReminder(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const todayExercise = await getTodayExercise(MY_USER_ID);
    if (todayExercise) {
      return;
    }

    const prompt = `Generate a motivational exercise reminder for me. I haven't exercised today yet.
    Use the exercise_analytics tool with action "generate_reminder" to get a motivational meme if available.
    Keep the message short, fun, and encouraging. Use emojis to make it engaging.
    If a meme URL is available, send it along with a short motivational message.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send exercise reminder: ${err}`);
  }
}
