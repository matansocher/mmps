import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { type Earthquake, formatEarthquake, getRecentEarthquakes } from '@services/earthquake-api';
import { sendShortenedMessage } from '@services/telegram';

const logger = new Logger('EarthquakeMonitorScheduler');

const seenEarthquakeIds = new Set<string>();

const MIN_MAGNITUDE = 6.0;
export const LOOKBACK_MINUTES = 15;

export async function earthquakeMonitor(bot: TelegramBot): Promise<void> {
  try {
    const startTime = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000);

    const earthquakes = await getRecentEarthquakes({
      minMagnitude: MIN_MAGNITUDE,
      startTime,
      orderBy: 'time',
      limit: 50,
    });

    if (earthquakes.length === 0) {
      logger.debug('No earthquakes detected in the last 10 minutes');
      return;
    }

    const newEarthquakes = earthquakes.filter((quake) => !seenEarthquakeIds.has(quake.id));

    if (newEarthquakes.length === 0) {
      logger.debug(`${earthquakes.length} earthquake(s) detected but all were already seen`);
      return;
    }

    logger.log(`Found ${newEarthquakes.length} new earthquake(s) to alert`);

    for (const quake of newEarthquakes) {
      try {
        const message = formatAlertMessage(quake);
        await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' });

        seenEarthquakeIds.add(quake.id);

        logger.log(`Sent alert for earthquake ${quake.id}: M${quake.properties.mag.toFixed(1)} - ${quake.properties.place}`);
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
