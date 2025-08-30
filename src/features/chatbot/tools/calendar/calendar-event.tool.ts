import { z } from 'zod';
import { Logger } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CalendarEvent, createEvent, deleteEvent, formatEvent, getUpcomingEvents, listEvents } from '@services/google-calendar';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

const logger = new Logger('calendar-event-tool');

export const calendarEventConfig: ToolConfig = {
  name: 'calendar_event',
  description: 'Create, list, or manage Google Calendar events.',
  schema: z.object({
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
  }),
  keywords: [
    'calendar',
    'event',
    'meeting',
    'appointment',
    'schedule',
    'reminder',
    'tomorrow',
    'today',
    'next week',
    'create event',
    'add to calendar',
    "what's on my calendar",
    'upcoming events',
    'schedule meeting',
    'book',
    'reserve',
    'plan',
    'organize',
    'set up',
    'arrange',
  ],
  instructions: `Use this tool when users want to:
    - Create calendar events: Extract the title, start/end times, and location
    - List upcoming events: Show what's on the calendar
    - Delete events: Remove an event by its ID
    
    When creating events, you should:
    1. Extract the event title from the user's message
    2. Convert dates/times to ISO format (YYYY-MM-DDTHH:mm:ss)
    3. Calculate end time based on duration if specified
    4. Extract location if mentioned
    5. Extract attendee emails if provided`,
};

export class CalendarEventTool implements ToolInstance {
  getName(): string {
    return calendarEventConfig.name;
  }

  getDescription(): string {
    return calendarEventConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return calendarEventConfig.schema;
  }

  getKeywords(): string[] {
    return calendarEventConfig.keywords;
  }

  getInstructions(): string {
    return calendarEventConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<any> {
    const { action, title, startDateTime, endDateTime, location, description, eventId, days, searchQuery } = context.parameters;

    try {
      switch (action) {
        case 'create':
          if (!title || !startDateTime || !endDateTime) {
            throw new Error('Title, start time, and end time are required for creating an event');
          }
          return await this.createEvent({ title, startDateTime, endDateTime, location, description });

        case 'list':
          return await this.listEvents(searchQuery);

        case 'upcoming':
          return await this.getUpcomingEvents(days || 7);

        case 'delete':
          if (!eventId) {
            throw new Error('Event ID is required for deleting an event');
          }
          return await this.deleteEvent(eventId);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (err) {
      logger.error(`Failed to execute calendar event tool: ${err}`);
      throw err;
    }
  }

  private async createEvent(params: { title: string; startDateTime: string; endDateTime: string; location?: string; description?: string }): Promise<any> {
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

  private async listEvents(searchQuery?: string): Promise<any> {
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

  private async getUpcomingEvents(days: number): Promise<any> {
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

  private async deleteEvent(eventId: string): Promise<any> {
    await deleteEvent(eventId);

    return {
      message: `✅ Event has been deleted successfully!`,
    };
  }

  private formatEvent(event: CalendarEvent): any {}
}
