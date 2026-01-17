import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { registry } from '@core/openapi';
import { Logger } from '@core/utils';
import { upsertCalendarEvents } from './mongo';

extendZodWithOpenApi(z);

const logger = new Logger('CalendarEventsApiController');

// Zod schemas for OpenAPI documentation
const CalendarEventDateTimeSchema = z.object({
  dateTime: z.string().optional().openapi({ description: 'ISO 8601 format for timed events', example: '2026-01-20T10:00:00+02:00' }),
  timeZone: z.string().optional().openapi({ description: 'Timezone identifier', example: 'Asia/Jerusalem' }),
});

const CreateCalendarEventSchema = z.object({
  googleEventId: z.string().openapi({ description: 'Google Calendar event ID', example: 'abc123xyz' }),
  summary: z.string().openapi({ description: 'Event title', example: 'Team meeting' }),
  description: z.string().optional().openapi({ description: 'Event description', example: 'Weekly sync' }),
  location: z.string().optional().openapi({ description: 'Event location', example: 'Office Room A' }),
  start: CalendarEventDateTimeSchema.openapi({ description: 'Event start time' }),
  end: CalendarEventDateTimeSchema.openapi({ description: 'Event end time' }),
});

const SyncCalendarEventsRequestSchema = z.object({
  events: z.array(CreateCalendarEventSchema).min(1).openapi({ description: 'Array of calendar events to sync' }),
});

const SyncCalendarEventsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      inserted: z.number().openapi({ description: 'Number of new events inserted', example: 5 }),
      updated: z.number().openapi({ description: 'Number of existing events updated', example: 2 }),
      total: z.number().openapi({ description: 'Total events processed', example: 7 }),
    })
    .optional(),
  error: z.string().optional().openapi({ description: 'Error message if success is false' }),
});

// Register endpoint with OpenAPI registry
registry.registerPath({
  method: 'post',
  path: '/api/calendar-events/sync',
  tags: ['Calendar Events'],
  summary: 'Sync Google Calendar events',
  description: 'Upserts calendar events - updates existing events by googleEventId or inserts new ones',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SyncCalendarEventsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Events synced successfully',
      content: {
        'application/json': {
          schema: SyncCalendarEventsResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request body',
      content: {
        'application/json': {
          schema: SyncCalendarEventsResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: SyncCalendarEventsResponseSchema,
        },
      },
    },
  },
});

type SyncCalendarEventsRequest = z.infer<typeof SyncCalendarEventsRequestSchema>;

export function registerCalendarEventsRoutes(app: Express): void {
  app.post('/api/calendar-events/sync', async (req: Request<object, object, SyncCalendarEventsRequest>, res: Response) => {
    try {
      const parseResult = SyncCalendarEventsRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message || 'Invalid request body' });
        return;
      }

      const { events } = parseResult.data;
      const result = await upsertCalendarEvents(events);

      logger.log(`Synced ${result.total} calendar events (inserted: ${result.inserted}, updated: ${result.updated})`);

      res.json({ success: true, data: result });
    } catch (err) {
      logger.error(`Failed to sync calendar events: ${err}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}
