import { addDays, addHours } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getDateString, getErrorMessage, Logger } from '@core/utils';
import type { CalendarEvent } from '@services/google-calendar';
import { createEvent, deleteEvent, listEvents, updateEvent } from '@services/google-calendar';
import { COMPETITION_IDS_MAP, getCompetitionTable, getUpcomingMatches } from '@services/scores-365';
import { sendShortenedMessage } from '@services/telegram';
import { SPORTS_CALENDAR_EVENT_DURATION_HOURS, SPORTS_CALENDAR_SOURCE } from './sports-calendar.config';
import { selectSportsCalendarMatches } from './utils';
import type { SelectedSportsMatch } from './utils';

const logger = new Logger('chatbot:scheduler:sports-calendar');
const SOURCE_PROPERTY = 'source';
const MATCH_ID_PROPERTY = 'scores365MatchId';
const COMPETITION_ID_PROPERTY = 'scores365CompetitionId';

type DateRange = {
  readonly startDate: string;
  readonly endDate: string;
};

type SyncResult = {
  readonly added: SelectedSportsMatch[];
  readonly updated: SelectedSportsMatch[];
  readonly removed: CalendarEvent[];
};

function getDateRange(now = new Date()): DateRange {
  const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
  const daysToAdd = zonedNow.getDay() === 3 ? 3 : 2;
  return {
    startDate: getDateString(now),
    endDate: formatInTimeZone(addDays(now, daysToAdd), DEFAULT_TIMEZONE, 'yyyy-MM-dd'),
  };
}

function getEventMetadata(match: SelectedSportsMatch): Record<string, string> {
  return {
    [SOURCE_PROPERTY]: SPORTS_CALENDAR_SOURCE,
    [MATCH_ID_PROPERTY]: match.id.toString(),
    [COMPETITION_ID_PROPERTY]: match.competitionId.toString(),
  };
}

function toCalendarEvent(match: SelectedSportsMatch): CalendarEvent {
  return {
    summary: `⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}`,
    description: match.competitionName,
    location: match.venue,
    start: {
      dateTime: match.startTime,
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: addHours(new Date(match.startTime), SPORTS_CALENDAR_EVENT_DURATION_HOURS).toISOString(),
      timeZone: DEFAULT_TIMEZONE,
    },
    extendedProperties: {
      private: getEventMetadata(match),
    },
  };
}

function isManagedEvent(event: CalendarEvent): boolean {
  return event.extendedProperties?.private?.[SOURCE_PROPERTY] === SPORTS_CALENDAR_SOURCE;
}

function eventNeedsUpdate(existing: CalendarEvent, desired: CalendarEvent): boolean {
  return (
    existing.summary !== desired.summary ||
    existing.description !== desired.description ||
    existing.location !== desired.location ||
    new Date(existing.start.dateTime).getTime() !== new Date(desired.start.dateTime).getTime() ||
    new Date(existing.end.dateTime).getTime() !== new Date(desired.end.dateTime).getTime() ||
    existing.extendedProperties?.private?.[COMPETITION_ID_PROPERTY] !== desired.extendedProperties?.private?.[COMPETITION_ID_PROPERTY]
  );
}

async function getManagedEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const timeMin = fromZonedTime(`${startDate}T00:00:00`, DEFAULT_TIMEZONE).toISOString();
  const timeMax = addDays(fromZonedTime(`${endDate}T00:00:00`, DEFAULT_TIMEZONE), 1).toISOString();
  const events = await listEvents({ timeMin, timeMax, maxResults: 250 });
  return events.filter(isManagedEvent);
}

async function getIsraeliPremierLeagueTable() {
  try {
    return (await getCompetitionTable(COMPETITION_IDS_MAP.LIGAT_HAAL))?.competitionTable ?? [];
  } catch (err) {
    logger.warn(`Israeli Premier League standings are unavailable; skipping standings-based matches: ${getErrorMessage(err)}`);
    return [];
  }
}

async function syncSportsCalendar(matches: SelectedSportsMatch[], existingEvents: CalendarEvent[]): Promise<SyncResult> {
  const added: SelectedSportsMatch[] = [];
  const updated: SelectedSportsMatch[] = [];
  const removed: CalendarEvent[] = [];
  const eventsByMatchId = new Map<string, CalendarEvent>();

  for (const event of existingEvents) {
    const matchId = event.extendedProperties?.private?.[MATCH_ID_PROPERTY];
    if (!event.id) {
      continue;
    }
    if (!matchId) {
      try {
        await deleteEvent(event.id);
        removed.push(event);
      } catch (err) {
        logger.error(`Failed to delete malformed managed calendar event ${event.id}: ${getErrorMessage(err)}`);
      }
      continue;
    }
    const duplicate = eventsByMatchId.get(matchId);
    if (duplicate) {
      try {
        await deleteEvent(event.id);
        removed.push(event);
      } catch (err) {
        logger.error(`Failed to delete duplicate calendar event ${event.id}: ${getErrorMessage(err)}`);
      }
      continue;
    }
    eventsByMatchId.set(matchId, event);
  }

  for (const match of matches) {
    const matchId = match.id.toString();
    const existing = eventsByMatchId.get(matchId);
    const desired = toCalendarEvent(match);
    if (existing) {
      eventsByMatchId.delete(matchId);
    }
    try {
      if (!existing) {
        await createEvent(desired);
        added.push(match);
      } else if (eventNeedsUpdate(existing, desired)) {
        await updateEvent(existing.id, desired);
        updated.push(match);
      }
    } catch (err) {
      logger.error(`Failed to sync match ${match.id}: ${getErrorMessage(err)}`);
    }
  }

  for (const staleEvent of eventsByMatchId.values()) {
    try {
      await deleteEvent(staleEvent.id);
      removed.push(staleEvent);
    } catch (err) {
      logger.error(`Failed to remove stale calendar event ${staleEvent.id}: ${getErrorMessage(err)}`);
    }
  }

  return { added, updated, removed };
}

function formatSummary(matches: SelectedSportsMatch[], result: SyncResult): string {
  if (matches.length === 0) {
    return result.removed.length > 0
      ? `✅ Sports calendar synced. Removed ${result.removed.length} cancelled or no longer relevant match${result.removed.length === 1 ? '' : 'es'}.`
      : 'No matches coming up for my favorite teams, the World Cup, or other important fixtures 🤷‍♂️';
  }

  const changes = [`Added ${result.added.length}`, `updated ${result.updated.length}`, `removed ${result.removed.length}`].join(', ');
  const matchList = matches.map((match) => `⚽ ${match.homeTeam.name} vs ${match.awayTeam.name}`).join('\n');
  return `✅ Sports calendar synced (${changes}):\n${matchList}`;
}

export async function sportsCalendar(bot: Bot): Promise<void> {
  try {
    const { startDate, endDate } = getDateRange();
    const [matches, table, existingEvents] = await Promise.all([getUpcomingMatches(startDate, endDate), getIsraeliPremierLeagueTable(), getManagedEvents(startDate, endDate)]);
    const selectedMatches = selectSportsCalendarMatches(matches, table);
    const result = await syncSportsCalendar(selectedMatches, existingEvents);
    await sendShortenedMessage(bot, MY_USER_ID, formatSummary(selectedMatches, result));
  } catch (err) {
    logger.error(`Failed to sync sports calendar: ${getErrorMessage(err)}`);
  }
}
