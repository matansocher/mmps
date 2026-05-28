import { addDays, startOfDay, startOfWeek, subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { listEvents } from '@services/google-calendar';
import type { CalendarEvent as GoogleCalendarEvent } from '@services/google-calendar';
import {
  createReminder,
  deleteReminder,
  getReminderById,
  getRemindersByUser,
  updateReminder,
  updateReminderStatus,
} from '@shared/reminders';
import { addExercise, getExercises, getTodayExercise } from '@shared/trainer';
import { createManualExpense, getExpensesBetween, type Expense } from '@shared/expenses';
import { getCurrentWeather, getForecastWeather } from '@services/weather';
import { chatbotAuthMiddleware } from './auth.middleware';
import type {
  ActivitySummary,
  CreateManualExpenseBody,
  CreateReminderBody,
  DashboardResponse,
  EventDto,
  ExerciseLogResponse,
  ExpenseDto,
  ExpenseTotal,
  HeatmapDay,
  ReminderDto,
  UpdateReminderBody,
  WeatherSnapshot,
} from './dto';

const logger = new Logger('ChatbotApiController');

const DEFAULT_WEATHER_LOCATION = 'Tel Aviv';
const HEATMAP_WEEKS = 13;

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

function toReminderDto(r: {
  _id: ObjectId;
  message: string;
  dueDate: Date;
  status: 'pending' | 'snoozed' | 'completed';
  snoozedUntil?: Date;
}): ReminderDto {
  return {
    id: r._id.toString(),
    message: r.message,
    dueDate: r.dueDate.toISOString(),
    status: r.status,
    snoozedUntil: r.snoozedUntil?.toISOString(),
  };
}

async function buildWeatherSnapshot(): Promise<WeatherSnapshot> {
  try {
    const tomorrowDate = formatInTimeZone(addDays(new Date(), 1), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    const [now, tomorrow] = await Promise.all([
      getCurrentWeather(DEFAULT_WEATHER_LOCATION).catch(() => null),
      getForecastWeather(DEFAULT_WEATHER_LOCATION, tomorrowDate).catch(() => null),
    ]);

    return {
      now: now
        ? {
            tempC: now.temperature,
            feelsLike: now.feelsLike,
            condition: now.condition,
            conditionCode: now.conditionCode,
            location: now.location,
          }
        : null,
      tomorrow: tomorrow
        ? {
            high: tomorrow.temperatureMax,
            low: tomorrow.temperatureMin,
            condition: tomorrow.condition,
            conditionCode: tomorrow.conditionCode,
            chanceOfRain: tomorrow.chanceOfRain,
          }
        : null,
    };
  } catch (err) {
    logger.warn(`Weather snapshot failed: ${err}`);
    return { now: null, tomorrow: null };
  }
}

function parseSelectedDate(raw: unknown): Date {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return fromZonedTime(`${raw}T00:00:00`, DEFAULT_TIMEZONE);
  }
  return fromZonedTime(`${dateKey(new Date())}T00:00:00`, DEFAULT_TIMEZONE);
}

function toExpenseDto(e: Expense): ExpenseDto {
  return {
    id: e._id!.toString(),
    vendor: e.vendor,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    type: e.type,
    transactionDate: (e.transactionDate ?? e.emailDate).toISOString(),
    notes: e.notes,
  };
}

function totalsByCurrency(expenses: ReadonlyArray<Expense>): ExpenseTotal[] {
  const acc = new Map<string, number>();
  for (const e of expenses) acc.set(e.currency, (acc.get(e.currency) ?? 0) + e.amount);
  return Array.from(acc.entries()).map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }));
}

async function fetchEventsForDate(date: Date): Promise<GoogleCalendarEvent[]> {
  try {
    const timeMin = date.toISOString();
    const timeMax = addDays(date, 1).toISOString();
    return await listEvents({ timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 });
  } catch (err) {
    logger.warn(`Failed to fetch calendar events for ${dateKey(date)}: ${err}`);
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

      const [weather, googleEvents, reminders, activity, dayExpenses] = await Promise.all([
        isToday ? buildWeatherSnapshot() : Promise.resolve(null),
        fetchEventsForDate(selectedDate),
        getRemindersByUser(chatId, true),
        buildActivitySummary(chatId),
        getExpensesBetween(selectedDate, addDays(selectedDate, 1)).catch((err) => {
          logger.warn(`Failed to fetch expenses for ${selectedKey}: ${err}`);
          return [] as Expense[];
        }),
      ]);

      const eventDtos = googleEvents.map((event, idx) => toEventDto(event, `event-${idx}`));
      const birthdays = eventDtos.filter((e) => e.isBirthday);
      const events = eventDtos.filter((e) => !e.isBirthday);

      const dayReminders = reminders.filter((r) => dateKey(r.dueDate) === selectedKey);

      res.json({
        date: selectedKey,
        isToday,
        weather,
        birthdays,
        events,
        reminders: dayReminders.map(toReminderDto),
        activity,
        expenses: dayExpenses.map(toExpenseDto),
        expenseTotals: totalsByCurrency(dayExpenses),
      });
    } catch (err) {
      logger.error(`dashboard failed: ${err}`);
      res.status(500).json({ error: 'dashboard_failed' });
    }
  });

  app.post('/api/chatbot/exercise/log', async (req: Request, res: Response<ExerciseLogResponse | { error: string }>) => {
    try {
      const { chatId } = req.chatbotUser!;
      const existing = await getTodayExercise(chatId);
      if (existing) {
        res.json({ logged: false, alreadyDoneToday: true });
        return;
      }
      await addExercise(chatId);
      res.json({ logged: true, alreadyDoneToday: false });
    } catch (err) {
      logger.error(`exercise log failed: ${err}`);
      res.status(500).json({ error: 'exercise_log_failed' });
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
      logger.error(`reminder create failed: ${err}`);
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
      } else if (body.snoozeMinutes && body.snoozeMinutes > 0) {
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
      logger.error(`reminder update failed: ${err}`);
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
      logger.error(`reminder delete failed: ${err}`);
      res.status(500).json({ error: 'delete_failed' });
    }
  });

  app.post('/api/chatbot/expenses', async (req: Request<object, object, CreateManualExpenseBody>, res: Response<ExpenseDto | { error: string }>) => {
    try {
      const body = req.body ?? ({} as CreateManualExpenseBody);
      if (!body.vendor || typeof body.vendor !== 'string') {
        res.status(400).json({ error: 'vendor_required' });
        return;
      }
      if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
        res.status(400).json({ error: 'amount_required' });
        return;
      }
      const created = await createManualExpense({ vendor: body.vendor, amount: body.amount });
      res.status(201).json(toExpenseDto(created));
    } catch (err) {
      logger.error(`expense create failed: ${err}`);
      res.status(500).json({ error: 'create_failed' });
    }
  });

  logger.log('Chatbot API routes registered at /api/chatbot/*');
}

async function buildActivitySummary(chatId: number): Promise<ActivitySummary> {
  const exercises = await getExercises(chatId, 1000);
  const today = startOfDay(new Date());
  const todayKey = dateKey(today);

  const doneDays = new Set<string>();
  for (const ex of exercises) doneDays.add(dateKey(ex.createdAt));

  const thisWeekSunday = startOfWeek(today, { weekStartsOn: 0 });
  const heatmapStart = subDays(thisWeekSunday, (HEATMAP_WEEKS - 1) * 7);
  const heatmap: HeatmapDay[] = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const day = addDays(heatmapStart, i);
    const key = dateKey(day);
    const future = key > todayKey;
    heatmap.push({ date: key, done: !future && doneDays.has(key), future });
  }

  return { todayDone: doneDays.has(todayKey), heatmap };
}
