import type { Bot } from 'grammy';
import { InputFile } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getUpcomingRainChances, type HourlyRainChance } from '@services/ims';
import { generateRainRadarAnimation, IMS_RADAR_PAGE_URL, type RainRadarAnimation } from '@services/rain-radar';

const logger = new Logger('chatbot:scheduler:rain-radar-alert');

const KFAR_SABA = { locationId: 16, lat: 32.1742, lon: 34.9076 };
const RAIN_CHANCE_THRESHOLD = 30; // alert only when the chance is above this
const LOOKAHEAD_HOURS = 3;
const ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000;

let lastAlertAt = 0;

export function buildRainAlertCaption(chances: ReadonlyArray<HourlyRainChance>, radar: RainRadarAnimation | null): string {
  const lines = ['🌧 צפוי גשם בכפר סבא בשעות הקרובות', '', ...chances.map(({ hour, rainChance }) => `${rainChance > RAIN_CHANCE_THRESHOLD ? '☔️' : '▫️'} ${hour} - ${rainChance}%`), ''];

  if (radar) {
    lines.push(`📡 ${radar.source === 'IMSRadar' ? 'מכ״ם' : 'מכ״ם משולב'} - השעה האחרונה, עד ${radar.latestTime.slice(11, 16)}`);
    if (radar.latestStatus === 1) lines.push('המכ״ם לא מזהה כרגע עננות פעילה');
  } else {
    lines.push('📡 לא הצלחתי להביא את תמונת המכ״ם');
  }

  lines.push(IMS_RADAR_PAGE_URL);
  return lines.join('\n');
}

async function sendRadar(bot: Bot, radar: RainRadarAnimation, caption: string): Promise<void> {
  try {
    await bot.api.sendAnimation(MY_USER_ID, new InputFile(radar.gif, 'rain-radar.gif'), { caption });
  } catch (err) {
    logger.warn(`Failed to send radar animation, sending still image instead: ${getErrorMessage(err)}`);
    await bot.api.sendPhoto(MY_USER_ID, new InputFile(radar.latestFrame, 'rain-radar.png'), { caption });
  }
}

export async function rainRadarAlert(bot: Bot, now: Date = new Date()): Promise<void> {
  try {
    if (now.getTime() - lastAlertAt < ALERT_COOLDOWN_MS) {
      return;
    }

    const chances = await getUpcomingRainChances(KFAR_SABA.locationId, LOOKAHEAD_HOURS, now);
    const maxChance = Math.max(0, ...chances.map(({ rainChance }) => rainChance));
    if (maxChance <= RAIN_CHANCE_THRESHOLD) {
      return;
    }

    logger.log(`Rain chance in Kfar Saba up to ${maxChance}% in the next ${LOOKAHEAD_HOURS} hours - generating radar animation`);

    const radar = await generateRainRadarAnimation({ marker: KFAR_SABA }).catch((err) => {
      logger.error(`Failed to generate radar animation: ${getErrorMessage(err)}`);
      return null;
    });

    const caption = buildRainAlertCaption(chances, radar);
    if (radar) {
      await sendRadar(bot, radar, caption);
    } else {
      await bot.api.sendMessage(MY_USER_ID, caption);
    }

    lastAlertAt = now.getTime();
    logger.log(`Sent rain radar alert (${radar ? `${radar.frameCount} radar frames` : 'text only'})`);
  } catch (err) {
    logger.error(`Failed to check rain radar: ${getErrorMessage(err)}`);
  }
}
