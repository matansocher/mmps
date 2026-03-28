import type { Bot } from 'grammy';
import { InputFile } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getCurrentWeather } from '@services/ims';
import { generateRainRadarImage } from '@services/rain-radar';
import { sendShortenedMessage } from '@services/telegram';

const logger = new Logger('RainRadarAlertScheduler');

const KFAR_SABA_LOCATION_ID = 16;
const RAIN_CHANCE_THRESHOLD = 20;

export async function rainRadarAlert(bot: Bot): Promise<void> {
  try {
    const weather = await getCurrentWeather(KFAR_SABA_LOCATION_ID);

    if (weather.chanceOfRain <= RAIN_CHANCE_THRESHOLD) {
      return;
    }

    logger.log(`Rain chance in Kfar Saba: ${weather.chanceOfRain}% — generating radar image`);

    let radarPath: string | null = null;
    try {
      radarPath = await generateRainRadarImage();
    } catch (err) {
      logger.error(`Failed to generate radar image: ${err}`);
    }

    const caption = `🌧 סיכוי לגשם בכפר סבא: ${weather.chanceOfRain}%`;

    if (radarPath) {
      await bot.api.sendPhoto(MY_USER_ID, new InputFile(radarPath), {
        caption,
      });
      logger.log('Sent rain radar alert with image');
    } else {
      await sendShortenedMessage(bot, MY_USER_ID, caption);
      logger.log('Sent rain radar alert (text only)');
    }
  } catch (err) {
    logger.error(`Failed to check rain radar: ${err}`);
  }
}
