import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { type Earthquake, formatEarthquake, getRecentEarthquakes, shouldNotifyAboutEarthquake } from '@services/earthquake-api';
import { generateEarthquakeMapImage } from '@services/earthquake-map';
import { sendShortenedMessage } from '@services/telegram';

const logger = new Logger('EarthquakeMonitorScheduler');

const seenEarthquakeIds = new Set<string>();

export const LOOKBACK_MINUTES = 15;

export async function earthquakeMonitor(bot: TelegramBot): Promise<void> {
  try {
    const startTime = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000);

    const earthquakes = await getRecentEarthquakes({
      startTime,
      orderBy: 'time',
      limit: 50,
    });

    const relevantEarthquakes = earthquakes.filter(shouldNotifyAboutEarthquake);

    if (relevantEarthquakes.length === 0) {
      return;
    }

    const newEarthquakes = relevantEarthquakes.filter((quake) => !seenEarthquakeIds.has(quake.id));
    if (newEarthquakes.length === 0) {
      return;
    }

    for (const quake of newEarthquakes) {
      try {
        const message = formatAlertMessage(quake);
        const [lon, lat] = quake.geometry.coordinates;

        let mapPath: string | null = null;
        try {
          mapPath = await generateEarthquakeMapImage({
            lat,
            lon,
            magnitude: quake.properties.mag,
            place: quake.properties.place,
          });
        } catch (mapErr) {
          logger.error(`Failed to generate map for earthquake ${quake.id}: ${mapErr.message}`);
        }

        if (mapPath) {
          await bot.sendPhoto(MY_USER_ID, mapPath, {
            caption: message,
            parse_mode: 'Markdown',
          });
          logger.log(`Sent alert with map for earthquake ${quake.id}: M${quake.properties.mag.toFixed(1)} - ${quake.properties.place}`);
        } else {
          await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' });
          logger.log(`Sent text-only alert for earthquake ${quake.id}: M${quake.properties.mag.toFixed(1)} - ${quake.properties.place}`);
        }

        seenEarthquakeIds.add(quake.id);
      } catch (err) {
        logger.error(`Failed to send alert for earthquake ${quake.id}: ${err.message}`);
      }
    }

    if (seenEarthquakeIds.size > 1000) {
      const idsArray = Array.from(seenEarthquakeIds);
      const toKeep = idsArray.slice(-800);
      seenEarthquakeIds.clear();
      toKeep.forEach((id) => seenEarthquakeIds.add(id));
      logger.debug(`Cleaned up earthquake ID tracking, now tracking ${seenEarthquakeIds.size} IDs`);
    }

    logger.log(`Successfully processed ${newEarthquakes.length} new earthquake(s)`);
  } catch (err) {
    logger.error(`Failed to check earthquakes: ${err.message}`);
  }
}

function formatAlertMessage(quake: Earthquake): string {
  const { properties } = quake;
  const severity = getSeverityLabel(properties.mag);

  let message = `🌍 *${severity} EARTHQUAKE ALERT*\n\n`;
  message += formatEarthquake(quake);

  return message;
}

function getSeverityLabel(magnitude: number): string {
  if (magnitude >= 8.0) return 'GREAT';
  if (magnitude >= 7.0) return 'MAJOR';
  if (magnitude >= 6.0) return 'STRONG';
  if (magnitude >= 5.0) return 'MODERATE';
  return 'MINOR';
}
