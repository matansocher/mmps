import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { CalendarEvent, listEvents } from '@services/google-calendar';

const logger = new Logger('UpcomingEventAlertScheduler');

export const LEAD_MINUTES = 15;
export const WINDOW_MINUTES = 15;
const GRACE_MS = 60 * 1000;

const formatTime = (isoString: string) => new Date(isoString).toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false });

function buildMessage(event: CalendarEvent): string {
  const title = event.summary || 'Untitled Event';
  const startStr = formatTime(event.start.dateTime!);
  const endStr = event.end?.dateTime ? ` - ${formatTime(event.end.dateTime)}` : '';
  const lines = [`📅 *Upcoming event* (in ~${LEAD_MINUTES} min)`, ``, `*${title}*`, `🕒 ${startStr}${endStr}`];
  if (event.location) lines.push(`📍 ${event.location}`);
  if (event.description) lines.push(``, event.description);
  return lines.join('\n');
}

export async function upcomingEventAlert(bot: Bot): Promise<void> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + LEAD_MINUTES * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + WINDOW_MINUTES * 60 * 1000);

    const events = await listEvents({ timeMin: windowStart.toISOString(), timeMax: windowEnd.toISOString(), singleEvents: true, orderBy: 'startTime' });

    const upcoming = (events || []).filter((event) => {
      if (!event.start?.dateTime) return false;
      if (event.status === 'cancelled') return false;
      const startTime = new Date(event.start.dateTime).getTime();
      return startTime >= windowStart.getTime() - GRACE_MS && startTime <= windowEnd.getTime();
    });

    if (!upcoming.length) {
      return;
    }

    logger.log(`Found ${upcoming.length} upcoming event(s) to alert`);

    for (const event of upcoming) {
      try {
        await bot.api.sendMessage(MY_USER_ID, buildMessage(event), { parse_mode: 'Markdown' });
      } catch (err) {
        logger.error(`Failed to send alert for event ${event.id}: ${getErrorMessage(err)}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to check upcoming events: ${getErrorMessage(err)}`);
  }
}
