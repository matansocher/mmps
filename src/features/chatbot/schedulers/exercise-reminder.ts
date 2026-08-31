import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getTodayExercise } from '@shared/trainer';
import type { ChatbotService } from '../chatbot.service';
import { buildExerciseKeyboard } from './exercise-actions';

const logger = new Logger('chatbot:scheduler:exercise-reminder');

export async function sendExerciseReminder(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  const todayExercise = await getTodayExercise(MY_USER_ID);
  if (todayExercise) {
    return;
  }

  const prompt = `Generate a motivational exercise reminder for me. I haven't exercised today yet.
    Use the exercise_analytics tool with action "generate_reminder" to get a motivational meme if available.
    Keep the message short, fun, and encouraging. Use emojis to make it engaging.
    Do NOT mention my current streak or the total number of exercises I've done all time.
    If a meme URL is available, send it along with a short motivational message.`;

  const response = await chatbotService.processMessage(prompt, MY_USER_ID, { ephemeral: { marker: '[scheduled: exercise reminder]' } });

  if (response?.message) {
    await bot.api.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown', reply_markup: buildExerciseKeyboard() });
  }
}

export async function exerciseReminder(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    await sendExerciseReminder(bot, chatbotService);
  } catch (err) {
    logger.error(`Failed to send exercise reminder: ${getErrorMessage(err)}`);
  }
}
