import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { generateRainRadarImage } from '@services/rain-radar';
import { getTodayHourlyForecast } from '@services/weather';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('RainRadarUpdateScheduler');
const LOCATION = 'Kfar Saba';
const RAIN_CHANCE_THRESHOLD = 50;

export async function rainRadarUpdate(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const forecast = await getTodayHourlyForecast(LOCATION);
    const currentHour = new Date().getHours();
    const upcomingHours = forecast.hourly.filter((h) => h.hour >= currentHour && h.hour <= currentHour + 3);

    // Check if any upcoming hour has rain chance above threshold
    const hasRain = upcomingHours.some((h) => h.willItRain || h.chanceOfRain >= RAIN_CHANCE_THRESHOLD);

    if (!hasRain) {
      logger.log(`No rain expected (threshold: ${RAIN_CHANCE_THRESHOLD}%) in the next 3 hours, skipping radar update`);
      return;
    }

    logger.log(`Rain expected (>=${RAIN_CHANCE_THRESHOLD}%), generating radar image`);
    const imageFilePath = await generateRainRadarImage();

    const rainInfo = upcomingHours
      .filter((h) => h.willItRain || h.chanceOfRain >= RAIN_CHANCE_THRESHOLD)
      .map((h) => `${h.hour}:00 - ${h.chanceOfRain}% chance`)
      .join(', ');

    const prompt = `Generate a brief, casual 1-2 sentence caption about incoming rain in Kfar Saba. Rain forecast: ${rainInfo}. Keep it short, informative, and slightly playful. Use a rain emoji.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);
    const caption = response?.message || '🌧️ Rain radar update for Kfar Saba';

    await bot.sendPhoto(MY_USER_ID, imageFilePath, { caption }).catch((err) => {
      logger.error(`Failed to send rain radar image: ${err}`);
      bot.sendMessage(MY_USER_ID, `I failed to send you the image\n${caption}`);
    });

    deleteFile(imageFilePath);

    logger.log('Rain radar update sent successfully');
  } catch (err) {
    logger.error(`Failed to send rain radar update: ${err}`);
  }
}
