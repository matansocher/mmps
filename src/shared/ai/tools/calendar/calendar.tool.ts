import { tool } from '@langchain/core/tools';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CalendarEvent, createEvent, deleteEvent, formatEvent, getEvent, getUpcomingEvents, listEvents, updateEvent } from '@services/google-calendar';

const schema = z.object({
  action: z.enum(['create', 'list', 'upcoming', 'update', 'delete']).describe('The action to perform with calendar events'),
  // For creating/updating events (on update, only pass the fields that change)
  title: z.string().optional().describe('The title/summary of the event'),
  startDateTime: z.string().optional().describe('Start date and time in ISO format (e.g., "2024-01-15T14:30:00")'),
  endDateTime: z.string().optional().describe('End date and time in ISO format (e.g., "2024-01-15T15:30:00")'),
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

type EventFields = Pick<SchemaType, 'title' | 'description' | 'startDateTime' | 'endDateTime' | 'location' | 'attendees'>;

async function createEventInternal(params: EventFields): Promise<any> {
  const { title, description, location, startDateTime, endDateTime, attendees } = params;
  const event: CalendarEvent = {
    summary: title,
    description,
    location,
    ...(attendees?.length && { attendees: attendees.map((email) => ({ email })) }),
    start: {
      dateTime: startDateTime,
      timeZone: DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: endDateTime,
      timeZone: DEFAULT_TIMEZONE,
    },
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

async function updateEventInternal(eventId: string, params: EventFields): Promise<any> {
  const { title, description, location, startDateTime, endDateTime, attendees } = params;
  const changes: Partial<CalendarEvent> = {
    ...(attendees?.length && { attendees: await mergeAttendees(eventId, attendees) }),
    ...(title !== undefined && { summary: title }),
    ...(description !== undefined && { description }),
    ...(location !== undefined && { location }),
    ...(startDateTime && { start: { dateTime: startDateTime, timeZone: DEFAULT_TIMEZONE } }),
    ...(endDateTime && { end: { dateTime: endDateTime, timeZone: DEFAULT_TIMEZONE } }),
  };

  if (Object.keys(changes).length === 0) {
    throw new Error('Provide at least one field to update (title, startDateTime, endDateTime, location, description, or attendees)');
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

async function runner({ action, title, startDateTime, endDateTime, location, description, attendees, eventId, days, searchQuery, startDate, endDate }: SchemaType) {
  switch (action) {
    case 'create':
      if (!title || !startDateTime || !endDateTime) {
        throw new Error('Title, start time, and end time are required for creating an event');
      }
      return await createEventInternal({ title, startDateTime, endDateTime, location, description, attendees });

    case 'list':
      return await listEventsInternal(searchQuery, startDate, endDate);

    case 'upcoming':
      return await getUpcomingEventsInternal(days || 7);

    case 'update':
      if (!eventId) {
        throw new Error('Event ID is required for updating an event');
      }
      return await updateEventInternal(eventId, { title, startDateTime, endDateTime, location, description, attendees });

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
- When the user wants an event's location set to a real place (restaurant, business, venue), resolve it with google_places first and use "<name>, <address>" as the location.
- Invite guests by passing their email addresses in attendees (on update they are added to the existing guests; nobody is removed). Google emails them the invite. If the user names someone without an email, look it up with the contacts tool or ask for it. Never invent an email address.`,
  schema,
});
