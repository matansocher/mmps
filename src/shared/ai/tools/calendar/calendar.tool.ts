import { tool } from '@langchain/core/tools';
import { addDays, format, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CalendarEvent, createEvent, deleteEvent, formatEvent, getEvent, getUpcomingEvents, listEvents, updateEvent } from '@services/google-calendar';
import { KNOWN_CONTACTS } from './constants';

const schema = z.object({
  action: z.enum(['create', 'list', 'upcoming', 'update', 'delete']).describe('The action to perform with calendar events'),
  // For creating/updating events (on update, only pass the fields that change)
  title: z.string().optional().describe('The title/summary of the event'),
  startDateTime: z.string().optional().describe('Start date and time in ISO format (e.g., "2024-01-15T14:30:00")'),
  endDateTime: z
    .string()
    .optional()
    .describe('End date and time in ISO format (e.g., "2024-01-15T15:30:00"). For all-day events this is the last day of the event (inclusive) and may be omitted for a single day'),
  allDay: z.boolean().optional().describe('Whether this is an all-day event (only the date part of startDateTime/endDateTime is used)'),
  recurrence: z
    .array(z.string())
    .optional()
    .describe(
      'RFC 5545 recurrence lines to make the event repeat, e.g. ["RRULE:FREQ=YEARLY"], ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE"], ["RRULE:FREQ=MONTHLY;COUNT=6"], ["RRULE:FREQ=DAILY;UNTIL=20250131"]. The first occurrence is startDateTime. On update pass an empty array to stop the event from repeating',
    ),
  location: z.string().optional().describe('Location of the event'),
  description: z.string().optional().describe('Description or notes for the event'),
  attendees: z.array(z.string().email()).optional().describe('Email addresses of people to invite to the event'),
  // For listing/searching events
  searchQuery: z.string().optional().describe('Search query to filter events when listing'),
  startDate: z.string().optional().describe('Start date to filter events from (ISO format: "2024-01-15" or "2024-01-15T00:00:00")'),
  endDate: z.string().optional().describe('End date to filter events until (ISO format: "2024-01-15" or "2024-01-15T23:59:59")'),
  days: z.number().optional().describe('Number of days to look ahead for upcoming events (default: 7)'),
  // For updating/deleting events
  eventId: z.string().optional().describe('The ID of an event (for update/delete actions), taken from a list/upcoming result'),
});

type SchemaType = z.infer<typeof schema>;

type EventFields = Pick<SchemaType, 'title' | 'description' | 'startDateTime' | 'endDateTime' | 'allDay' | 'recurrence' | 'location' | 'attendees'>;

function toDate(value: string): string {
  return value.split('T')[0];
}

// clearOther nulls the opposite field so a patch can switch an event between timed and all-day
function buildEventTimes({ startDateTime, endDateTime, allDay }: EventFields, clearOther = false): Pick<CalendarEvent, 'start' | 'end'> {
  if (allDay) {
    const startDate = toDate(startDateTime);
    // Google's all-day end date is exclusive
    const endDate = format(addDays(parseISO(toDate(endDateTime || startDateTime)), 1), 'yyyy-MM-dd');
    const cleared = clearOther ? { dateTime: null } : {};
    return { start: { date: startDate, ...cleared }, end: { date: endDate, ...cleared } };
  }
  const cleared = clearOther ? { date: null } : {};
  return {
    start: { dateTime: startDateTime, timeZone: DEFAULT_TIMEZONE, ...cleared },
    end: { dateTime: endDateTime, timeZone: DEFAULT_TIMEZONE, ...cleared },
  };
}

async function createEventInternal(params: EventFields): Promise<any> {
  const { title, description, location, recurrence, attendees } = params;
  const event: CalendarEvent = {
    summary: title,
    description,
    location,
    ...(attendees?.length && { attendees: attendees.map((email) => ({ email })) }),
    ...(recurrence?.length && { recurrence }),
    ...buildEventTimes(params),
  };

  const createdEvent = await createEvent(event);

  return {
    message: `✅ Event "${createdEvent.summary}" has been created successfully!`,
    event: formatEvent(createdEvent),
    link: (createdEvent as any).htmlLink || `https://calendar.google.com/calendar/r/eventedit/${createdEvent.id}`,
  };
}

async function listEventsInternal(searchQuery?: string, startDate?: string, endDate?: string): Promise<any> {
  const options: any = { maxResults: 50 };

  if (searchQuery) {
    options.q = searchQuery;
  }

  if (startDate) {
    options.timeMin = fromZonedTime(`${startDate.split('T')[0]}T00:00:00`, DEFAULT_TIMEZONE).toISOString();
  }

  if (endDate) {
    options.timeMax = fromZonedTime(`${endDate.split('T')[0]}T23:59:59.999`, DEFAULT_TIMEZONE).toISOString();
  }

  const events = await listEvents(options);

  if (events.length === 0) {
    return {
      message: '📅 No events found in your calendar.',
      events: [],
    };
  }

  return {
    success: true,
    message: `📅 Found ${events.length} event(s) in your calendar:`,
    events: events.map((event) => formatEvent(event)),
  };
}

async function getUpcomingEventsInternal(days: number): Promise<any> {
  const events = await getUpcomingEvents(days);

  if (events.length === 0) {
    return {
      success: true,
      message: `📅 No upcoming events in the next ${days} days.`,
      events: [],
    };
  }

  return {
    message: `📅 Your upcoming events for the next ${days} days:`,
    events: events.map((event) => formatEvent(event)),
  };
}

async function mergeAttendees(eventId: string, emails: string[]): Promise<CalendarEvent['attendees']> {
  const { attendees: existing = [] } = await getEvent(eventId);
  const merged = new Map(existing.map((attendee) => [attendee.email.toLowerCase(), attendee]));
  emails.forEach((email) => {
    if (!merged.has(email.toLowerCase())) merged.set(email.toLowerCase(), { email });
  });
  return [...merged.values()];
}

async function buildUpdatedTimes(eventId: string, { startDateTime, endDateTime, allDay }: EventFields): Promise<Partial<CalendarEvent>> {
  if (allDay) {
    if (!startDateTime) {
      throw new Error('startDateTime is required when changing an event to all-day');
    }
    return buildEventTimes({ startDateTime, endDateTime, allDay }, true);
  }
  return {
    ...(startDateTime && { start: { dateTime: startDateTime, date: null, timeZone: DEFAULT_TIMEZONE } }),
    ...(endDateTime && { end: { dateTime: endDateTime, date: null, timeZone: DEFAULT_TIMEZONE } }),
  };
}

async function updateEventInternal(eventId: string, params: EventFields): Promise<any> {
  const { title, description, location, startDateTime, endDateTime, allDay, recurrence, attendees } = params;
  const times = startDateTime || endDateTime ? await buildUpdatedTimes(eventId, { startDateTime, endDateTime, allDay }) : {};
  const changes: Partial<CalendarEvent> = {
    ...(attendees?.length && { attendees: await mergeAttendees(eventId, attendees) }),
    ...(title !== undefined && { summary: title }),
    ...(description !== undefined && { description }),
    ...(location !== undefined && { location }),
    ...(recurrence !== undefined && { recurrence }),
    ...times,
  };

  if (Object.keys(changes).length === 0) {
    throw new Error('Provide at least one field to update (title, startDateTime, endDateTime, recurrence, location, description, or attendees)');
  }

  const updatedEvent = await updateEvent(eventId, changes);

  return {
    message: `✅ Event "${updatedEvent.summary}" has been updated successfully!`,
    event: formatEvent(updatedEvent),
  };
}

async function deleteEventInternal(eventId: string): Promise<any> {
  await deleteEvent(eventId);

  return {
    message: `✅ Event has been deleted successfully!`,
  };
}

async function runner({ action, title, startDateTime, endDateTime, allDay, recurrence, location, description, attendees, eventId, days, searchQuery, startDate, endDate }: SchemaType) {
  switch (action) {
    case 'create':
      if (!title || !startDateTime || (!endDateTime && !allDay)) {
        throw new Error('Title, start time, and end time (unless allDay) are required for creating an event');
      }
      return await createEventInternal({ title, startDateTime, endDateTime, allDay, recurrence, location, description, attendees });

    case 'list':
      return await listEventsInternal(searchQuery, startDate, endDate);

    case 'upcoming':
      return await getUpcomingEventsInternal(days || 7);

    case 'update':
      if (!eventId) {
        throw new Error('Event ID is required for updating an event');
      }
      return await updateEventInternal(eventId, { title, startDateTime, endDateTime, allDay, recurrence, location, description, attendees });

    case 'delete':
      if (!eventId) {
        throw new Error('Event ID is required for deleting an event');
      }
      return await deleteEventInternal(eventId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export const calendarTool = tool(runner, {
  name: 'calendar',
  description: `Create, list, update, or delete Google Calendar events.
- To update or delete an event, first find its id with list (searchQuery/dates) or upcoming, then call update/delete with eventId. On update pass only the fields that change.
- Recurring events: pass recurrence (RRULE lines) on create, or on update to make an existing event repeat. Yearly birthdays/anniversaries are usually all-day with ["RRULE:FREQ=YEARLY"]. To mimic an existing event, list it first and match its allDay value (an occurrence with recurringEventId is part of a repeating series).
- list/upcoming return single occurrences; an occurrence of a recurring event has recurringEventId. Using the occurrence id with update/delete affects only that occurrence; use recurringEventId as eventId to change or delete the whole series (including its recurrence).
- When the user wants an event's location set to a real place (restaurant, business, venue), resolve it with google_places first and use "<name>, <address>" as the location.
- Invite guests by passing their email addresses in attendees (on update they are added to the existing guests; nobody is removed). Google emails them the invite. If the user names someone who is not in the known contacts below and gives no email, ask for it. Never invent an email address.
- Known contacts (the first one is the user's wife). Whenever the user mentions one of them by any of their names, invite them with their email (no lookup needed):
${KNOWN_CONTACTS.map(({ names, email }) => `  - ${names.map((name) => `"${name}"`).join(' / ')}: ${email}`).join('\n')}`,
  schema,
});
