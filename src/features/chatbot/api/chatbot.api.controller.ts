import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { addDays, differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { registry } from '@core/openapi';
import { getErrorMessage, Logger } from '@core/utils';
import { fetchEmailFull, fetchUserEmails, markEmailAsRead, trashEmail } from '@services/gmail';
import { createEvent, deleteEvent, listEvents } from '@services/google-calendar';
import type { CalendarEvent as GoogleCalendarEvent } from '@services/google-calendar';
import { aggregateUsage } from '@shared/ai';
import { createReminder, deleteReminder, getPendingRemindersDueOnOrBefore, getReminderById, getRemindersCompletedBetween, updateReminder, updateReminderStatus } from '@shared/reminders';
import { chatbotAuthMiddleware } from './auth.middleware';
import type {
  CreateEventBody,
  CreateReminderBody,
  DashboardResponse,
  EventDto,
  FullEmailDto,
  ReminderDto,
  UnreadEmailsResponse,
  UpcomingBirthdayDto,
  UpcomingBirthdaysResponse,
  UpdateReminderBody,
  UsageResponse,
} from './dto';

extendZodWithOpenApi(z);

const logger = new Logger('ChatbotApiController');

// --- Zod schemas for OpenAPI ---

const ReminderDtoSchema = z.object({
  id: z.string(),
  message: z.string(),
  dueDate: z.string(),
  status: z.enum(['pending', 'snoozed', 'completed']),
  snoozedUntil: z.string().optional(),
});

const EventDtoSchema = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string().optional(),
  isAllDay: z.boolean(),
  isBirthday: z.boolean(),
  location: z.string().optional(),
});

const DashboardResponseSchema = z.object({
  date: z.string(),
  isToday: z.boolean(),
  birthdays: z.array(EventDtoSchema),
  events: z.array(EventDtoSchema),
  reminders: z.array(ReminderDtoSchema),
});

const CreateReminderBodySchema = z.object({
  message: z.string(),
  dueDate: z.string().describe('ISO 8601 date-time'),
});

const UpdateReminderBodySchema = z.object({
  message: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'completed']).optional(),
  snoozeMinutes: z.number().optional(),
});

const CreateEventBodySchema = z.object({
  summary: z.string(),
  start: z.string().describe('ISO 8601 date-time'),
  end: z.string().describe('ISO 8601 date-time'),
  location: z.string().optional(),
});

const ErrorSchema = z.object({ error: z.string() });

const UsageResponseSchema = z.object({
  days: z.number(),
  totals: z.object({ cost: z.number(), turns: z.number(), tokensTotal: z.number() }),
  perDay: z.array(z.object({ day: z.string(), cost: z.number(), turns: z.number(), tokensTotal: z.number() })),
  perSource: z.array(z.object({ source: z.string(), cost: z.number(), turns: z.number(), tokensTotal: z.number() })),
});

const EmailDtoSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string(),
  snippet: z.string(),
});

const UnreadEmailsResponseSchema = z.object({ emails: z.array(EmailDtoSchema) });

const FullEmailDtoSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string(),
  date: z.string(),
  bodyText: z.string(),
});

const UpcomingBirthdayDtoSchema = z.object({
  id: z.string(),
  summary: z.string(),
  date: z.string(),
  inDays: z.number(),
});

const UpcomingBirthdaysResponseSchema = z.object({ birthdays: z.array(UpcomingBirthdayDtoSchema) });

// --- OpenAPI route registrations ---

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/dashboard',
  tags: ['Chatbot'],
  summary: 'Get dashboard data (events, reminders)',
  request: { query: z.object({ date: z.string().optional().describe('YYYY-MM-DD; defaults to today') }) },
  responses: {
    200: { description: 'Dashboard payload', content: { 'application/json': { schema: DashboardResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/reminders',
  tags: ['Chatbot'],
  summary: 'Create a reminder',
  request: { body: { content: { 'application/json': { schema: CreateReminderBodySchema } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ReminderDtoSchema } } },
    400: { description: 'Invalid body', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/chatbot/reminders/{id}',
  tags: ['Chatbot'],
  summary: 'Update a reminder (edit, complete, snooze)',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: UpdateReminderBodySchema } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ReminderDtoSchema } } },
    400: { description: 'Invalid id/body', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/chatbot/reminders/{id}',
  tags: ['Chatbot'],
  summary: 'Delete a reminder',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Deleted' },
    400: { description: 'Invalid id', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/calendar/events',
  tags: ['Chatbot'],
  summary: 'Create a Google Calendar event in the primary calendar',
  request: { body: { content: { 'application/json': { schema: CreateEventBodySchema } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: EventDtoSchema } } },
    400: { description: 'Invalid body', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/chatbot/calendar/events/{id}',
  tags: ['Chatbot'],
  summary: 'Delete a Google Calendar event from the primary calendar',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Deleted' },
    400: { description: 'Invalid id', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/usage',
  tags: ['Chatbot'],
  summary: 'Get aggregated AI usage stats',
  request: { query: z.object({ days: z.enum(['7', '30']).optional().describe("'7' or '30'; defaults to 7") }) },
  responses: {
    200: { description: 'Usage data', content: { 'application/json': { schema: UsageResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/emails/unread',
  tags: ['Chatbot'],
  summary: 'List unread inbox emails',
  responses: {
    200: { description: 'Emails', content: { 'application/json': { schema: UnreadEmailsResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/emails/{id}',
  tags: ['Chatbot'],
  summary: 'Get a single email by id',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Email', content: { 'application/json': { schema: FullEmailDtoSchema } } },
    400: { description: 'Invalid id', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/emails/{id}/read',
  tags: ['Chatbot'],
  summary: 'Mark an email as read',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Marked as read' },
    400: { description: 'Invalid id', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/chatbot/emails/{id}',
  tags: ['Chatbot'],
  summary: 'Trash an email',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Trashed' },
    400: { description: 'Invalid id', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/birthdays/upcoming',
  tags: ['Chatbot'],
  summary: 'Get upcoming birthdays in the next 7 days',
  responses: {
    200: { description: 'Birthdays', content: { 'application/json': { schema: UpcomingBirthdaysResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

function dateKey(date: Date): string {
  return formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
}

function isBirthdayEvent(summary: string): boolean {
  return summary.toLowerCase().includes('birthday');
}

function toEventDto(event: GoogleCalendarEvent, fallbackId: string): EventDto {
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startValue = (event.start?.dateTime ?? event.start?.date) as string | undefined;
  const endValue = event.end?.dateTime ?? event.end?.date;
  return {
    id: event.id ?? fallbackId,
    summary: event.summary ?? '(no title)',
    start: startValue ?? '',
    end: endValue,
    isAllDay,
    isBirthday: isBirthdayEvent(event.summary ?? ''),
    location: event.location,
  };
}

function toReminderDto(r: { _id: ObjectId; message: string; dueDate: Date; status: 'pending' | 'snoozed' | 'completed'; snoozedUntil?: Date }): ReminderDto {
  return {
    id: r._id.toString(),
    message: r.message,
    dueDate: r.dueDate.toISOString(),
    status: r.status,
    snoozedUntil: r.snoozedUntil?.toISOString(),
  };
}

function parseSelectedDate(raw: unknown): Date {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return fromZonedTime(`${raw}T00:00:00`, DEFAULT_TIMEZONE);
  }
  return fromZonedTime(`${dateKey(new Date())}T00:00:00`, DEFAULT_TIMEZONE);
}

async function fetchEventsForDate(date: Date): Promise<GoogleCalendarEvent[]> {
  try {
    const timeMin = date.toISOString();
    const timeMax = addDays(date, 1).toISOString();
    return await listEvents({ timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 });
  } catch (err) {
    logger.warn(`Failed to fetch calendar events for ${dateKey(date)}: ${getErrorMessage(err)}`);
    return [];
  }
}

export function registerChatbotApiRoutes(app: Express): void {
  app.use('/api/chatbot', chatbotAuthMiddleware);

  app.get('/api/chatbot/dashboard', async (req: Request, res: Response<DashboardResponse | { error: string }>) => {
    try {
      const { chatId } = req.chatbotUser!;
      const now = new Date();
      const selectedDate = parseSelectedDate(req.query.date);
      const selectedKey = dateKey(selectedDate);
      const isToday = selectedKey === dateKey(now);
      const selectedDayEnd = addDays(selectedDate, 1);

      const [googleEvents, pendingReminders, completedReminders] = await Promise.all([
        fetchEventsForDate(selectedDate),
        getPendingRemindersDueOnOrBefore(chatId, selectedDayEnd),
        getRemindersCompletedBetween(chatId, selectedDate, selectedDayEnd),
      ]);

      const eventDtos = googleEvents.map((event, idx) => toEventDto(event, `event-${idx}`));
      const birthdays = eventDtos.filter((e) => e.isBirthday);
      const events = eventDtos.filter((e) => !e.isBirthday);
      const reminders = [...pendingReminders, ...completedReminders];

      res.json({
        date: selectedKey,
        isToday,
        birthdays,
        events,
        reminders: reminders.map(toReminderDto),
      });
    } catch (err) {
      logger.error(`dashboard failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'dashboard_failed' });
    }
  });

  app.post('/api/chatbot/reminders', async (req: Request<object, object, CreateReminderBody>, res: Response<ReminderDto | { error: string }>) => {
    try {
      const { chatId } = req.chatbotUser!;
      const { message, dueDate } = req.body ?? {};
      if (!message || !dueDate) {
        res.status(400).json({ error: 'invalid_body' });
        return;
      }
      const due = new Date(dueDate);
      if (Number.isNaN(due.getTime())) {
        res.status(400).json({ error: 'invalid_date' });
        return;
      }
      const result = await createReminder({ chatId, message, dueDate: due });
      const created = await getReminderById(result.insertedId, chatId);
      if (!created) {
        res.status(500).json({ error: 'create_failed' });
        return;
      }
      res.status(201).json(toReminderDto(created));
    } catch (err) {
      logger.error(`reminder create failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'create_failed' });
    }
  });

  app.patch('/api/chatbot/reminders/:id', async (req: Request<{ id: string }, object, UpdateReminderBody>, res: Response<ReminderDto | { error: string }>) => {
    try {
      const { chatId } = req.chatbotUser!;
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      const body = req.body ?? {};

      if (body.status === 'completed') {
        await updateReminderStatus(id, chatId, 'completed');
      } else if (body.snoozeMinutes !== undefined) {
        if (!Number.isInteger(body.snoozeMinutes) || body.snoozeMinutes <= 0) {
          res.status(400).json({ error: 'invalid_snooze' });
          return;
        }
        const until = new Date(Date.now() + body.snoozeMinutes * 60 * 1000);
        await updateReminderStatus(id, chatId, 'snoozed', until);
      } else {
        const updates: { message?: string; dueDate?: Date; status?: 'pending' } = {};
        if (body.message !== undefined) updates.message = body.message;
        if (body.dueDate !== undefined) {
          const due = new Date(body.dueDate);
          if (Number.isNaN(due.getTime())) {
            res.status(400).json({ error: 'invalid_date' });
            return;
          }
          updates.dueDate = due;
        }
        if (body.status === 'pending') updates.status = 'pending';
        if (Object.keys(updates).length > 0) {
          await updateReminder(id, chatId, updates);
        }
      }

      const updated = await getReminderById(id, chatId);
      if (!updated) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(toReminderDto(updated));
    } catch (err) {
      logger.error(`reminder update failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.delete('/api/chatbot/reminders/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { chatId } = req.chatbotUser!;
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      const deleted = await deleteReminder(id, chatId);
      if (!deleted) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.status(204).end();
    } catch (err) {
      logger.error(`reminder delete failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'delete_failed' });
    }
  });

  app.post('/api/chatbot/calendar/events', async (req: Request<object, object, CreateEventBody>, res: Response<EventDto | { error: string }>) => {
    try {
      const { summary, start, end, location } = req.body ?? {};
      if (!summary || !start || !end) {
        res.status(400).json({ error: 'invalid_body' });
        return;
      }
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        res.status(400).json({ error: 'invalid_date' });
        return;
      }
      const created = await createEvent({
        summary,
        location,
        start: { dateTime: startDate.toISOString(), timeZone: DEFAULT_TIMEZONE },
        end: { dateTime: endDate.toISOString(), timeZone: DEFAULT_TIMEZONE },
      });
      res.status(201).json(toEventDto(created, 'event-created'));
    } catch (err) {
      logger.error(`calendar event create failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'create_failed' });
    }
  });

  app.delete('/api/chatbot/calendar/events/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || id.length > 1024) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      try {
        await deleteEvent(id);
      } catch (err) {
        const status = (err as { code?: number; status?: number })?.code ?? (err as { code?: number; status?: number })?.status;
        if (status === 404 || status === 410) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        throw err;
      }
      res.status(204).end();
    } catch (err) {
      logger.error(`calendar event delete failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'delete_failed' });
    }
  });

  app.get('/api/chatbot/usage', async (req: Request, res: Response<UsageResponse | { error: string }>) => {
    try {
      const rawDays = req.query.days;
      const days = rawDays === '30' ? 30 : 7;
      const from = subDays(new Date(), days);
      const rows = await aggregateUsage({ from });

      const totalCost = rows.reduce((s, r) => s + r.cost, 0);
      const totalTurns = rows.reduce((s, r) => s + r.turns, 0);
      const totalTokens = rows.reduce((s, r) => s + r.tokensTotal, 0);

      const dayMap = new Map<string, { cost: number; turns: number; tokensTotal: number }>();
      for (let i = 0; i < days; i++) {
        const key = dateKey(addDays(from, i + 1));
        dayMap.set(key, { cost: 0, turns: 0, tokensTotal: 0 });
      }
      for (const r of rows) {
        const entry = dayMap.get(r.day) ?? { cost: 0, turns: 0, tokensTotal: 0 };
        entry.cost += r.cost;
        entry.turns += r.turns;
        entry.tokensTotal += r.tokensTotal;
        dayMap.set(r.day, entry);
      }
      const perDay = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, ...v }));

      const sourceMap = new Map<string, { cost: number; turns: number; tokensTotal: number }>();
      for (const r of rows) {
        const entry = sourceMap.get(r.source) ?? { cost: 0, turns: 0, tokensTotal: 0 };
        entry.cost += r.cost;
        entry.turns += r.turns;
        entry.tokensTotal += r.tokensTotal;
        sourceMap.set(r.source, entry);
      }
      const perSource = [...sourceMap.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([source, v]) => ({ source, ...v }));

      res.json({ days, totals: { cost: totalCost, turns: totalTurns, tokensTotal: totalTokens }, perDay, perSource });
    } catch (err) {
      logger.error(`usage failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'usage_failed' });
    }
  });

  app.get('/api/chatbot/emails/unread', async (req: Request, res: Response<UnreadEmailsResponse | { error: string }>) => {
    try {
      const emails = (await fetchUserEmails('is:unread in:inbox', 10)) ?? [];
      res.json({ emails });
    } catch (err) {
      logger.error(`emails failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'emails_failed' });
    }
  });

  app.get('/api/chatbot/emails/:id', async (req: Request<{ id: string }>, res: Response<FullEmailDto | { error: string }>) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || id.length > 256) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      const email = await fetchEmailFull(id);
      if (!email) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({ id: email.id, from: email.from, subject: email.subject, date: email.date, bodyText: email.bodyText });
    } catch (err) {
      logger.error(`email fetch failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'emails_failed' });
    }
  });

  app.post('/api/chatbot/emails/:id/read', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || id.length > 256) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      await markEmailAsRead(id);
      res.status(204).end();
    } catch (err) {
      logger.error(`mark read failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'mark_read_failed' });
    }
  });

  app.delete('/api/chatbot/emails/:id', async (req: Request<{ id: string }>, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || id.length > 256) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      await trashEmail(id);
      res.status(204).end();
    } catch (err) {
      logger.error(`email delete failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'delete_failed' });
    }
  });

  app.get('/api/chatbot/birthdays/upcoming', async (req: Request, res: Response<UpcomingBirthdaysResponse | { error: string }>) => {
    try {
      const now = new Date();
      const events = await listEvents({ timeMin: now.toISOString(), timeMax: addDays(now, 7).toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 250 });
      const todayKey = dateKey(now);
      const birthdays: UpcomingBirthdayDto[] = events
        .filter((e) => e.start && isBirthdayEvent(e.summary ?? ''))
        .map((e): UpcomingBirthdayDto => {
          const dateStr = (e.start!.date ?? dateKey(new Date(e.start!.dateTime!))) as string;
          const inDays = differenceInCalendarDays(parseISO(dateStr), parseISO(todayKey));
          return { id: e.id ?? '', summary: e.summary ?? '(no title)', date: dateStr, inDays };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      res.json({ birthdays });
    } catch (err) {
      logger.error(`birthdays failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'birthdays_failed' });
    }
  });

  logger.log('Chatbot API routes registered at /api/chatbot/*');
}
