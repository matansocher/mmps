import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { CalendarEvent, listEvents } from '@services/google-calendar';
import { getEventOutcomes } from '@services/polymarket';
import { SPORTS_CALENDAR_SOURCE } from './sports-calendar.config';
import { findMatchEventSlug, formatMatchOdds } from './utils';

const logger = new Logger('chatbot:scheduler:upcoming-event-alert');

export const LEAD_MINUTES = 15;
export const WINDOW_MINUTES = 15;
const GRACE_MS = 60 * 1000;

const MATCH_TITLE_PATTERN = /^⚽\s*(.+?)\s+vs\s+(.+)$/;

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

export function parseMatchTeams(summary: string): { readonly homeTeam: string; readonly awayTeam: string } | null {
  const match = MATCH_TITLE_PATTERN.exec(summary.trim());
  if (!match) {
    return null;
  }
  return { homeTeam: match[1].trim(), awayTeam: match[2].trim() };
}

function isSportsCalendarEvent(event: CalendarEvent): boolean {
  return event.extendedProperties?.private?.source === SPORTS_CALENDAR_SOURCE;
}

async function getMatchOddsSection(event: CalendarEvent): Promise<string> {
  if (!isSportsCalendarEvent(event)) {
    return '';
  }

  const teams = parseMatchTeams(event.summary || '');
  if (!teams) {
    return '';
  }

  try {
    const kickoff = new Date(event.start.dateTime!);
    const slug = await findMatchEventSlug(teams.homeTeam, teams.awayTeam, kickoff);
    if (!slug) {
      logger.log(`No Polymarket market found for ${teams.homeTeam} vs ${teams.awayTeam}`);
      return '';
    }
    return formatMatchOdds(await getEventOutcomes(slug));
  } catch (err) {
    logger.warn(`Failed to fetch Polymarket odds for ${teams.homeTeam} vs ${teams.awayTeam}: ${getErrorMessage(err)}`);
    return '';
  }
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
        const oddsSection = await getMatchOddsSection(event);
        const message = oddsSection ? `${buildMessage(event)}\n\n${oddsSection}` : buildMessage(event);
        await bot.api.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });
      } catch (err) {
        logger.error(`Failed to send alert for event ${event.id}: ${getErrorMessage(err)}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to check upcoming events: ${getErrorMessage(err)}`);
  }
}
