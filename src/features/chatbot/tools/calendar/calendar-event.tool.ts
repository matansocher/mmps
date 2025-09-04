import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CalendarEvent, createEvent, deleteEvent, formatEvent, getUpcomingEvents, listEvents } from '@services/google-calendar';

const schema = z.object({
  action: z.enum(['create', 'list', 'upcoming', 'delete']).describe('The action to perform with calendar events'),
  // For creating events
  title: z.string().optional().describe('The title/summary of the event'),
  startDateTime: z.string().optional().describe('Start date and time in ISO format (e.g., "2024-01-15T14:30:00")'),
  endDateTime: z.string().optional().describe('End date and time in ISO format (e.g., "2024-01-15T15:30:00")'),
  location: z.string().optional().describe('Location of the event'),
  description: z.string().optional().describe('Description or notes for the event'),
  // For listing/searching events
  searchQuery: z.string().optional().describe('Search query to filter events when listing'),
  days: z.number().optional().describe('Number of days to look ahead for upcoming events (default: 7)'),
  // For deleting events
  eventId: z.string().optional().describe('The ID of an event (for delete action)'),
});

async function createEventInternal(params: { title: string; startDateTime: string; endDateTime: string; location?: string; description?: string }): Promise<any> {
  const { title, description, location, startDateTime, endDateTime } = params;
  const event: CalendarEvent = {
    summary: title,
    description,
    location,
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

async function listEventsInternal(searchQuery?: string): Promise<any> {
  const options = searchQuery ? { q: searchQuery, maxResults: 10 } : { maxResults: 10 };
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

async function deleteEventInternal(eventId: string): Promise<any> {
  await deleteEvent(eventId);

  return {
    message: `✅ Event has been deleted successfully!`,
  };
}

async function runner({ action, title, startDateTime, endDateTime, location, description, eventId, days, searchQuery }: z.infer<typeof schema>) {
  switch (action) {
    case 'create':
      if (!title || !startDateTime || !endDateTime) {
        throw new Error('Title, start time, and end time are required for creating an event');
      }
      return await createEventInternal({ title, startDateTime, endDateTime, location, description });

    case 'list':
      return await listEventsInternal(searchQuery);

    case 'upcoming':
      return await getUpcomingEventsInternal(days || 7);

    case 'delete':
      if (!eventId) {
        throw new Error('Event ID is required for deleting an event');
      }
      return await deleteEventInternal(eventId);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export const calendarEventTool = tool(runner, {
  name: 'calendar_event',
  description: 'Create, list, or manage Google Calendar events.',
  schema,
});
