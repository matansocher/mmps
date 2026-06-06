import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { addDays, endOfMonth, startOfDay, startOfWeek, subDays, subMonths } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { env } from 'node:process';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { registry } from '@core/openapi';
import { Logger } from '@core/utils';
import { deleteEvent, listEvents } from '@services/google-calendar';
import type { CalendarEvent as GoogleCalendarEvent } from '@services/google-calendar';
import { notify } from '@services/notifier';
import { getCurrentWeather, getForecastWeather } from '@services/weather';
import {
  bulkUpdateExpensesByEffectiveVendor,
  createManualExpense,
  type Currency,
  DEFAULT_CURRENCY,
  effectiveCategory,
  effectiveType,
  effectiveVendor,
  type Expense,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseType,
  getAllExpensesByEffectiveCategory,
  getAllExpensesByEffectiveVendor,
  getExpensesBetween,
  SUPPORTED_CURRENCIES,
} from '@shared/expenses';
import { updateUserOverrides } from '@shared/expenses/mongo/expenses.repository';
import { createReminder, deleteReminder, getPendingRemindersDueOnOrBefore, getReminderById, getRemindersCompletedBetween, updateReminder, updateReminderStatus } from '@shared/reminders';
import { addExercise, getExercises, getTodayExercise } from '@shared/trainer';
import { BOT_CONFIG } from '../chatbot.config';
import { addExpenseToDailyLog } from '../schedulers';
import { chatbotAuthMiddleware } from './auth.middleware';
import type {
  ActivitySummary,
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CreateManualExpenseBody,
  CreateReminderBody,
  DashboardResponse,
  EventDto,
  ExerciseLogResponse,
  ExpenseCategoryBreakdown,
  ExpenseCategoryDelta,
  ExpenseCategoryDetailResponse,
  ExpenseCategoryDto,
  ExpenseChargeDto,
  ExpenseDto,
  ExpenseMonthlyPoint,
  ExpensePacePrimary,
  ExpensesMonthResponse,
  ExpenseTotal,
  ExpenseTrajectoryPoint,
  ExpenseTypeBreakdown,
  ExpenseTypeDto,
  ExpenseVendorDetailResponse,
  HeatmapDay,
  ReminderDto,
  UpdateExpenseBody,
  UpdateReminderBody,
  WeatherSnapshot,
} from './dto';

extendZodWithOpenApi(z);

const logger = new Logger('ChatbotApiController');

const DEFAULT_WEATHER_LOCATION = 'Tel Aviv';
const HEATMAP_WEEKS = 13;
const EXPENSE_TYPES: ReadonlyArray<ExpenseType> = ['receipt', 'card_alert', 'bill'];

// --- Zod schemas for OpenAPI ---

const ExpenseCategoryEnum = z.enum(EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]]);
const ExpenseTypeEnum = z.enum(EXPENSE_TYPES as unknown as [ExpenseType, ...ExpenseType[]]);

const ExpenseDtoSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  category: ExpenseCategoryEnum,
  amount: z.number(),
  currency: z.string(),
  type: ExpenseTypeEnum,
  transactionDate: z.string(),
  originalVendor: z.string().optional(),
  originalCategory: ExpenseCategoryEnum.optional(),
  originalType: ExpenseTypeEnum.optional(),
});

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

const HeatmapDaySchema = z.object({
  date: z.string(),
  done: z.boolean(),
  future: z.boolean(),
});

const WeatherSnapshotSchema = z.object({
  now: z
    .object({
      tempC: z.number(),
      feelsLike: z.number().optional(),
      condition: z.string(),
      conditionCode: z.number().optional(),
      location: z.string(),
    })
    .nullable(),
  tomorrow: z
    .object({
      high: z.number(),
      low: z.number(),
      condition: z.string(),
      conditionCode: z.number().optional(),
      chanceOfRain: z.number().optional(),
    })
    .nullable(),
});

const DashboardResponseSchema = z.object({
  date: z.string(),
  isToday: z.boolean(),
  weather: WeatherSnapshotSchema.nullable(),
  birthdays: z.array(EventDtoSchema),
  events: z.array(EventDtoSchema),
  reminders: z.array(ReminderDtoSchema),
  activity: z.object({
    todayDone: z.boolean(),
    heatmap: z.array(HeatmapDaySchema),
  }),
  expenses: z.array(ExpenseDtoSchema),
  expenseTotals: z.array(z.object({ currency: z.string(), total: z.number() })),
});

const ExpensePacePrimarySchema = z.object({
  currency: z.string(),
  currentTotal: z.number(),
  projectedTotal: z.number().nullable(),
  throughDayOfMonth: z.number(),
  daysInMonth: z.number(),
  comparableHistoricToDate: z.number().nullable(),
  historicAvgMonthlyTotal: z.number().nullable(),
  percentVsHistoric: z.number().nullable(),
  baselineMonthCount: z.number(),
  isCurrentMonth: z.boolean(),
});

const ExpenseTrajectoryPointSchema = z.object({
  day: z.number(),
  actual: z.number().nullable(),
  expected: z.number().nullable(),
});

const ExpenseCategoryDeltaSchema = z.object({
  category: ExpenseCategoryEnum,
  currency: z.string(),
  currentTotal: z.number(),
  currentCount: z.number(),
  comparableHistoricAvg: z.number().nullable(),
  percentVsHistoric: z.number().nullable(),
});

const ExpenseChargeDtoSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  amount: z.number(),
  currency: z.string(),
  transactionDate: z.string(),
  category: ExpenseCategoryEnum,
});

const ExpensesMonthResponseSchema = z.object({
  month: z.string(),
  expenses: z.array(ExpenseDtoSchema),
  totals: z.array(z.object({ currency: z.string(), total: z.number() })),
  byCategory: z.array(z.object({ category: ExpenseCategoryEnum, currency: z.string(), total: z.number(), count: z.number() })),
  byType: z.array(z.object({ type: ExpenseTypeEnum, currency: z.string(), total: z.number(), count: z.number() })),
  pace: ExpensePacePrimarySchema,
  trajectory: z.array(ExpenseTrajectoryPointSchema),
  categoryDeltas: z.array(ExpenseCategoryDeltaSchema),
  topCharges: z.array(ExpenseChargeDtoSchema),
});

const ExpenseMonthlyPointSchema = z.object({ month: z.string(), total: z.number() });

const ExpenseCategoryDetailResponseSchema = z.object({
  category: ExpenseCategoryEnum,
  currency: z.string(),
  total: z.number(),
  count: z.number(),
  avg: z.number(),
  firstDate: z.string().nullable(),
  lastDate: z.string().nullable(),
  totals: z.array(z.object({ currency: z.string(), total: z.number() })),
  monthlyTotals: z.array(ExpenseMonthlyPointSchema),
  topVendors: z.array(z.object({ vendor: z.string(), total: z.number(), count: z.number() })),
  expenses: z.array(ExpenseDtoSchema),
});

const ExpenseVendorDetailResponseSchema = z.object({
  vendor: z.string(),
  currency: z.string(),
  total: z.number(),
  count: z.number(),
  avg: z.number(),
  firstDate: z.string().nullable(),
  lastDate: z.string().nullable(),
  totals: z.array(z.object({ currency: z.string(), total: z.number() })),
  dominantCategory: z.object({ category: ExpenseCategoryEnum, share: z.number() }).nullable(),
  monthlyTotals: z.array(ExpenseMonthlyPointSchema),
  expenses: z.array(ExpenseDtoSchema),
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

const UpdateExpenseBodySchema = z.object({
  userVendor: z.string().nullable().optional(),
  userCategory: ExpenseCategoryEnum.nullable().optional(),
  userType: ExpenseTypeEnum.nullable().optional(),
});

const BulkUpdateVendorBodySchema = z.object({
  name: z.string(),
  userVendor: z.string().nullable().optional(),
  userCategory: ExpenseCategoryEnum.nullable().optional(),
});

const BulkUpdateVendorResponseSchema = z.object({
  modifiedCount: z.number(),
  vendor: ExpenseVendorDetailResponseSchema,
});

const ExpenseLogAckSchema = z.object({ logged: z.literal(true) });

const LogExpenseBodySchema = z.object({
  vendor: z.string(),
  amount: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]]).optional(),
});

const ExerciseLogResponseSchema = z.object({
  logged: z.boolean(),
  alreadyDoneToday: z.boolean(),
});

const CreateManualExpenseBodySchema = z.object({
  vendor: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES as unknown as [string, ...string[]]).optional(),
  transactionDate: z.string().optional().describe('ISO 8601; defaults to now'),
  category: ExpenseCategoryEnum.optional().describe('When provided, skips AI categorization'),
});

const ErrorSchema = z.object({ error: z.string() });

// --- OpenAPI route registrations ---

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/dashboard',
  tags: ['Chatbot'],
  summary: 'Get dashboard data (weather, events, reminders, exercise activity, expenses summary)',
  request: { query: z.object({ date: z.string().optional().describe('YYYY-MM-DD; defaults to today') }) },
  responses: {
    200: { description: 'Dashboard payload', content: { 'application/json': { schema: DashboardResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/expenses',
  tags: ['Chatbot'],
  summary: 'Get expenses for a month with pace, trajectory, category deltas, and top charges vs trailing-3 baseline',
  request: { query: z.object({ month: z.string().optional().describe('YYYY-MM; defaults to current month') }) },
  responses: {
    200: { description: 'Expenses month payload', content: { 'application/json': { schema: ExpensesMonthResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/expenses/category/{category}',
  tags: ['Chatbot'],
  summary: 'Get lifetime expenses for a category, with monthly totals and top vendors',
  request: { params: z.object({ category: ExpenseCategoryEnum }) },
  responses: {
    200: { description: 'Category detail', content: { 'application/json': { schema: ExpenseCategoryDetailResponseSchema } } },
    400: { description: 'Invalid category', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/chatbot/expenses/vendor',
  tags: ['Chatbot'],
  summary: 'Get lifetime expenses for a vendor (matches effective vendor exactly, case-insensitive)',
  request: { query: z.object({ name: z.string().describe('Vendor display name (effective vendor)') }) },
  responses: {
    200: { description: 'Vendor detail', content: { 'application/json': { schema: ExpenseVendorDetailResponseSchema } } },
    400: { description: 'Missing vendor name', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/chatbot/expenses/vendor',
  tags: ['Chatbot'],
  summary: 'Bulk-update all expenses matching a vendor (name or category)',
  request: {
    body: { content: { 'application/json': { schema: BulkUpdateVendorBodySchema } } },
  },
  responses: {
    200: { description: 'Bulk update result + refreshed vendor detail', content: { 'application/json': { schema: BulkUpdateVendorResponseSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Vendor not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/exercise/log',
  tags: ['Chatbot'],
  summary: "Log today's exercise (idempotent per day)",
  responses: {
    200: { description: 'Logged or already-done', content: { 'application/json': { schema: ExerciseLogResponseSchema } } },
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
  method: 'patch',
  path: '/api/chatbot/expenses/{id}',
  tags: ['Chatbot'],
  summary: 'Override the AI-inferred vendor / category / type for an expense (null clears the override)',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: UpdateExpenseBodySchema } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ExpenseDtoSchema } } },
    400: { description: 'Invalid id/body', content: { 'application/json': { schema: ErrorSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/expenses',
  tags: ['Chatbot'],
  summary: 'Log an expense for the daily 23:00 transactions report (in-memory only, not persisted)',
  request: { body: { content: { 'application/json': { schema: LogExpenseBodySchema } } } },
  responses: {
    202: { description: 'Logged for end-of-day report', content: { 'application/json': { schema: ExpenseLogAckSchema } } },
    400: { description: 'Invalid body', content: { 'application/json': { schema: ErrorSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/chatbot/expenses/manual',
  tags: ['Chatbot'],
  summary: 'Create a manual expense (persists to mongo; AI-categorized; user can override later via PATCH)',
  request: { body: { content: { 'application/json': { schema: CreateManualExpenseBodySchema } } } },
  responses: {
    201: { description: 'Created expense', content: { 'application/json': { schema: ExpenseDtoSchema } } },
    400: { description: 'Invalid body', content: { 'application/json': { schema: ErrorSchema } } },
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

async function buildWeatherSnapshot(): Promise<WeatherSnapshot> {
  try {
    const tomorrowDate = formatInTimeZone(addDays(new Date(), 1), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    const [now, tomorrow] = await Promise.all([getCurrentWeather(DEFAULT_WEATHER_LOCATION).catch(() => null), getForecastWeather(DEFAULT_WEATHER_LOCATION, tomorrowDate).catch(() => null)]);

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
  const vendor = effectiveVendor(e);
  const category = effectiveCategory(e) as ExpenseCategoryDto;
  const type = effectiveType(e) as ExpenseTypeDto;
  return {
    id: e._id!.toString(),
    vendor,
    category,
    amount: e.amount,
    currency: e.currency,
    type,
    transactionDate: e.transactionDate.toISOString(),
    originalVendor: e.userVendor && e.vendor !== e.userVendor ? e.vendor : undefined,
    originalCategory: e.userCategory && e.category !== e.userCategory ? (e.category as ExpenseCategoryDto) : undefined,
    originalType: e.userType && e.type !== e.userType ? (e.type as ExpenseTypeDto) : undefined,
  };
}

const CURRENCY_SYMBOL_MAP: Record<string, Currency> = { '₪': 'ILS', $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };

function parseExpensePayload(raw: unknown): { vendor: string | null; amount: number | null; currency?: Currency } {
  const body = (raw ?? {}) as Record<string, unknown>;

  const vendorRaw = body.vendor ?? body.merchant ?? body.name;
  const vendor = typeof vendorRaw === 'string' && vendorRaw.trim() ? vendorRaw.trim() : null;

  let currency: Currency | undefined;
  const currencyRaw = body.currency;
  if (typeof currencyRaw === 'string' && currencyRaw.trim()) {
    currency = currencyRaw.trim().toUpperCase() as Currency;
  }

  let amount: number | null = null;
  const amountRaw = body.amount;
  if (typeof amountRaw === 'number' && Number.isFinite(amountRaw) && amountRaw > 0) {
    amount = amountRaw;
  } else if (typeof amountRaw === 'string') {
    const trimmed = amountRaw.trim();
    if (!currency) {
      for (const [symbol, code] of Object.entries(CURRENCY_SYMBOL_MAP)) {
        if (trimmed.includes(symbol)) {
          currency = code;
          break;
        }
      }
    }
    const numeric = parseFloat(trimmed.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) amount = numeric;
  }

  return { vendor, amount, currency };
}

function totalsByCurrency(expenses: ReadonlyArray<Expense>): ExpenseTotal[] {
  const acc = new Map<string, number>();
  for (const e of expenses) acc.set(e.currency, (acc.get(e.currency) ?? 0) + e.amount);
  return Array.from(acc.entries()).map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }));
}

function categoryBreakdown(expenses: ReadonlyArray<Expense>): ExpenseCategoryBreakdown[] {
  const map = new Map<string, ExpenseCategoryBreakdown>();
  for (const e of expenses) {
    const cat = effectiveCategory(e) as ExpenseCategoryDto;
    const key = `${cat}|${e.currency}`;
    const existing = map.get(key);
    if (existing) map.set(key, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    else map.set(key, { category: cat, currency: e.currency, total: e.amount, count: 1 });
  }
  return Array.from(map.values())
    .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

function typeBreakdown(expenses: ReadonlyArray<Expense>): ExpenseTypeBreakdown[] {
  const map = new Map<string, ExpenseTypeBreakdown>();
  for (const e of expenses) {
    const t = effectiveType(e) as ExpenseTypeDto;
    const key = `${t}|${e.currency}`;
    const existing = map.get(key);
    if (existing) map.set(key, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    else map.set(key, { type: t, currency: e.currency, total: e.amount, count: 1 });
  }
  return Array.from(map.values())
    .map((t) => ({ ...t, total: Math.round(t.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

function parseSelectedMonth(raw: unknown): { ym: string; start: Date; endExclusive: Date } {
  const todayYm = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM');
  const ym = typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw) ? raw : todayYm;
  const start = fromZonedTime(`${ym}-01T00:00:00`, DEFAULT_TIMEZONE);
  const zoned = toZonedTime(start, DEFAULT_TIMEZONE);
  const endDay = endOfMonth(zoned);
  const endExclusive = fromZonedTime(formatInTimeZone(addDays(endDay, 1), DEFAULT_TIMEZONE, "yyyy-MM-dd'T'00:00:00"), DEFAULT_TIMEZONE);
  return { ym, start, endExclusive };
}

function getMonthBoundaries(ym: string): { ym: string; start: Date; endExclusive: Date; daysInMonth: number } {
  const start = fromZonedTime(`${ym}-01T00:00:00`, DEFAULT_TIMEZONE);
  const startZoned = toZonedTime(start, DEFAULT_TIMEZONE);
  const endDay = endOfMonth(startZoned);
  const daysInMonth = endDay.getDate();
  const endExclusive = fromZonedTime(formatInTimeZone(addDays(endDay, 1), DEFAULT_TIMEZONE, "yyyy-MM-dd'T'00:00:00"), DEFAULT_TIMEZONE);
  return { ym, start, endExclusive, daysInMonth };
}

function prevYm(ym: string, monthsBack: number): string {
  const start = fromZonedTime(`${ym}-01T00:00:00`, DEFAULT_TIMEZONE);
  const prev = subMonths(toZonedTime(start, DEFAULT_TIMEZONE), monthsBack);
  return formatInTimeZone(fromZonedTime(prev, DEFAULT_TIMEZONE), DEFAULT_TIMEZONE, 'yyyy-MM');
}

function zonedDayOfMonth(d: Date): number {
  return parseInt(formatInTimeZone(d, DEFAULT_TIMEZONE, 'd'), 10);
}

function pickPrimaryCurrency(expenses: ReadonlyArray<Expense>): string {
  if (expenses.length === 0) return DEFAULT_CURRENCY;
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.amount);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function monthlyTotalsForCurrency(expenses: ReadonlyArray<Expense>, currency: string, months = 12): ExpenseMonthlyPoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = formatInTimeZone(d, DEFAULT_TIMEZONE, 'yyyy-MM');
    buckets.set(ym, 0);
  }
  for (const e of expenses) {
    if (e.currency !== currency) continue;
    const ym = formatInTimeZone(e.transactionDate, DEFAULT_TIMEZONE, 'yyyy-MM');
    if (buckets.has(ym)) buckets.set(ym, (buckets.get(ym) ?? 0) + e.amount);
  }
  return [...buckets.entries()].map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
}

function buildCategoryDetail(category: ExpenseCategory, expenses: ReadonlyArray<Expense>): ExpenseCategoryDetailResponse {
  const sorted = [...expenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  const primaryCurrency = pickPrimaryCurrency(sorted);
  const primary = sorted.filter((e) => e.currency === primaryCurrency);
  const total = primary.reduce((s, e) => s + e.amount, 0);
  const count = primary.length;
  const avg = count > 0 ? total / count : 0;
  const firstDate = sorted.length > 0 ? sorted[sorted.length - 1].transactionDate.toISOString() : null;
  const lastDate = sorted.length > 0 ? sorted[0].transactionDate.toISOString() : null;

  const vendorMap = new Map<string, { vendor: string; total: number; count: number }>();
  for (const e of primary) {
    const v = effectiveVendor(e);
    const existing = vendorMap.get(v);
    if (existing) vendorMap.set(v, { ...existing, total: existing.total + e.amount, count: existing.count + 1 });
    else vendorMap.set(v, { vendor: v, total: e.amount, count: 1 });
  }
  const topVendors = [...vendorMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((v) => ({ ...v, total: Math.round(v.total * 100) / 100 }));

  return {
    category: category as ExpenseCategoryDto,
    currency: primaryCurrency,
    total: Math.round(total * 100) / 100,
    count,
    avg: Math.round(avg * 100) / 100,
    firstDate,
    lastDate,
    totals: totalsByCurrency(sorted),
    monthlyTotals: monthlyTotalsForCurrency(sorted, primaryCurrency, 12),
    topVendors,
    expenses: sorted.map(toExpenseDto),
  };
}

function buildVendorDetail(name: string, expenses: ReadonlyArray<Expense>): ExpenseVendorDetailResponse {
  const sorted = [...expenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  const primaryCurrency = pickPrimaryCurrency(sorted);
  const primary = sorted.filter((e) => e.currency === primaryCurrency);
  const total = primary.reduce((s, e) => s + e.amount, 0);
  const count = primary.length;
  const avg = count > 0 ? total / count : 0;
  const firstDate = sorted.length > 0 ? sorted[sorted.length - 1].transactionDate.toISOString() : null;
  const lastDate = sorted.length > 0 ? sorted[0].transactionDate.toISOString() : null;

  let dominantCategory: ExpenseVendorDetailResponse['dominantCategory'] = null;
  if (primary.length > 0) {
    const catMap = new Map<string, number>();
    for (const e of primary) {
      const cat = effectiveCategory(e) as string;
      catMap.set(cat, (catMap.get(cat) ?? 0) + e.amount);
    }
    const top = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
    dominantCategory = { category: top[0] as ExpenseCategoryDto, share: total > 0 ? top[1] / total : 0 };
  }

  const displayVendor = sorted.length > 0 ? effectiveVendor(sorted[0]) : name;

  return {
    vendor: displayVendor,
    currency: primaryCurrency,
    total: Math.round(total * 100) / 100,
    count,
    avg: Math.round(avg * 100) / 100,
    firstDate,
    lastDate,
    totals: totalsByCurrency(sorted),
    dominantCategory,
    monthlyTotals: monthlyTotalsForCurrency(sorted, primaryCurrency, 12),
    expenses: sorted.map(toExpenseDto),
  };
}

type BaselineMonth = {
  readonly ym: string;
  readonly start: Date;
  readonly endExclusive: Date;
  readonly daysInMonth: number;
  readonly expenses: ReadonlyArray<Expense>; // primary-currency only
};

type Baseline = {
  readonly monthCount: number;
  readonly months: ReadonlyArray<BaselineMonth>;
  readonly avgFullMonthTotal: number; // mean of full-month totals across baseline months
  readonly avgToDateTotal: number; // mean of (days 1..throughDay) totals across baseline months
  readonly byCategoryAvg: Map<string, number>; // mean across baseline months (missing = 0)
  readonly byCategoryMonthsPresent: Map<string, number>;
  readonly byVendorAvg: Map<string, number>;
  readonly byVendorMonthsPresent: Map<string, number>;
  readonly allVendors: Set<string>;
};

function buildBaseline(allExpenses: ReadonlyArray<Expense>, selectedYm: string, throughDayOfSelected: number, primaryCurrency: string): Baseline {
  const candidates: BaselineMonth[] = [];
  for (let i = 1; i <= 3; i++) {
    const b = getMonthBoundaries(prevYm(selectedYm, i));
    const monthExp = allExpenses.filter((e) => e.currency === primaryCurrency && e.transactionDate >= b.start && e.transactionDate < b.endExclusive);
    if (monthExp.length === 0) continue;
    candidates.push({ ...b, expenses: monthExp });
  }
  const months = candidates;
  const monthCount = months.length;

  if (monthCount === 0) {
    return {
      monthCount: 0,
      months: [],
      avgFullMonthTotal: 0,
      avgToDateTotal: 0,
      byCategoryAvg: new Map(),
      byCategoryMonthsPresent: new Map(),
      byVendorAvg: new Map(),
      byVendorMonthsPresent: new Map(),
      allVendors: new Set(),
    };
  }

  let sumFull = 0;
  let sumToDate = 0;
  const byCatTotals = new Map<string, number>();
  const byCatPresent = new Map<string, number>();
  const byVenTotals = new Map<string, number>();
  const byVenPresent = new Map<string, number>();
  const allVendors = new Set<string>();

  for (const m of months) {
    const seenCats = new Set<string>();
    const seenVens = new Set<string>();
    for (const e of m.expenses) {
      sumFull += e.amount;
      const day = zonedDayOfMonth(e.transactionDate);
      // Cap "to-date" at min(throughDay, daysInMonth-of-this-baseline-month) so a baseline
      // month shorter than the selected one is still scaled fairly.
      const compareThrough = Math.min(throughDayOfSelected, m.daysInMonth);
      if (day <= compareThrough) sumToDate += e.amount;
      const cat = effectiveCategory(e) as string;
      const ven = effectiveVendor(e);
      byCatTotals.set(cat, (byCatTotals.get(cat) ?? 0) + e.amount);
      byVenTotals.set(ven, (byVenTotals.get(ven) ?? 0) + e.amount);
      seenCats.add(cat);
      seenVens.add(ven);
      allVendors.add(ven);
    }
    for (const c of seenCats) byCatPresent.set(c, (byCatPresent.get(c) ?? 0) + 1);
    for (const v of seenVens) byVenPresent.set(v, (byVenPresent.get(v) ?? 0) + 1);
  }

  const avgFullMonthTotal = sumFull / monthCount;
  const avgToDateTotal = sumToDate / monthCount;
  const byCategoryAvg = new Map<string, number>();
  for (const [k, v] of byCatTotals) byCategoryAvg.set(k, v / monthCount);
  const byVendorAvg = new Map<string, number>();
  for (const [k, v] of byVenTotals) byVendorAvg.set(k, v / monthCount);

  return {
    monthCount,
    months,
    avgFullMonthTotal,
    avgToDateTotal,
    byCategoryAvg,
    byCategoryMonthsPresent: byCatPresent,
    byVendorAvg,
    byVendorMonthsPresent: byVenPresent,
    allVendors,
  };
}

function computePace(
  monthExpensesPrimary: ReadonlyArray<Expense>,
  baseline: Baseline,
  primaryCurrency: string,
  selectedYm: string,
  daysInSelectedMonth: number,
  isCurrentMonth: boolean,
  todayDayOfMonth: number,
): ExpensePacePrimary {
  const throughDayOfMonth = isCurrentMonth ? Math.min(todayDayOfMonth, daysInSelectedMonth) : daysInSelectedMonth;

  const currentTotal = monthExpensesPrimary.filter((e) => zonedDayOfMonth(e.transactionDate) <= throughDayOfMonth).reduce((s, e) => s + e.amount, 0);

  const historicAvgMonthlyTotal = baseline.monthCount > 0 ? baseline.avgFullMonthTotal : null;
  const comparableHistoricToDate = baseline.monthCount > 0 ? baseline.avgToDateTotal : null;

  // Projection only meaningful for current (in-progress) month.
  let projectedTotal: number | null = null;
  if (isCurrentMonth && baseline.monthCount > 0) {
    // projected = currentMTD + avgHistoricTail (avg of (fullMonth - mtdAtSameDay) across baseline)
    let sumTail = 0;
    for (const m of baseline.months) {
      const fullTotal = m.expenses.reduce((s, e) => s + e.amount, 0);
      const compareThrough = Math.min(throughDayOfMonth, m.daysInMonth);
      const mtd = m.expenses.filter((e) => zonedDayOfMonth(e.transactionDate) <= compareThrough).reduce((s, e) => s + e.amount, 0);
      sumTail += fullTotal - mtd;
    }
    const avgTail = sumTail / baseline.monthCount;
    projectedTotal = round2(currentTotal + avgTail);
  } else if (!isCurrentMonth) {
    // For past months, "projected" equals the actual final total.
    projectedTotal = round2(currentTotal);
  }

  const percentVsHistoric = comparableHistoricToDate !== null && comparableHistoricToDate > 0 ? Math.round(((currentTotal - comparableHistoricToDate) / comparableHistoricToDate) * 100) : null;

  return {
    currency: primaryCurrency,
    currentTotal: round2(currentTotal),
    projectedTotal,
    throughDayOfMonth,
    daysInMonth: daysInSelectedMonth,
    comparableHistoricToDate: comparableHistoricToDate !== null ? round2(comparableHistoricToDate) : null,
    historicAvgMonthlyTotal: historicAvgMonthlyTotal !== null ? round2(historicAvgMonthlyTotal) : null,
    percentVsHistoric,
    baselineMonthCount: baseline.monthCount,
    isCurrentMonth,
  };
}

function buildTrajectory(monthExpensesPrimary: ReadonlyArray<Expense>, baseline: Baseline, daysInSelectedMonth: number, isCurrentMonth: boolean, todayDayOfMonth: number): ExpenseTrajectoryPoint[] {
  const dailyActual: number[] = new Array(daysInSelectedMonth + 1).fill(0);
  for (const e of monthExpensesPrimary) {
    const day = zonedDayOfMonth(e.transactionDate);
    if (day >= 1 && day <= daysInSelectedMonth) dailyActual[day] += e.amount;
  }
  const avgFull = baseline.monthCount > 0 ? baseline.avgFullMonthTotal : null;
  const points: ExpenseTrajectoryPoint[] = [];
  let cum = 0;
  const lastActualDay = isCurrentMonth ? Math.min(todayDayOfMonth, daysInSelectedMonth) : daysInSelectedMonth;
  for (let d = 1; d <= daysInSelectedMonth; d++) {
    cum += dailyActual[d];
    const actual = d <= lastActualDay ? round2(cum) : null;
    const expected = avgFull !== null ? round2(avgFull * (d / daysInSelectedMonth)) : null;
    points.push({ day: d, actual, expected });
  }
  return points;
}

function enrichCategoryDeltas(monthExpensesPrimary: ReadonlyArray<Expense>, baseline: Baseline, primaryCurrency: string): ExpenseCategoryDelta[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const e of monthExpensesPrimary) {
    const cat = effectiveCategory(e) as string;
    const cur = totals.get(cat) ?? { total: 0, count: 0 };
    totals.set(cat, { total: cur.total + e.amount, count: cur.count + 1 });
  }
  const out: ExpenseCategoryDelta[] = [];
  for (const [cat, { total, count }] of totals) {
    const baseAvg = baseline.byCategoryAvg.get(cat) ?? null;
    const present = baseline.byCategoryMonthsPresent.get(cat) ?? 0;
    const showDelta = baseline.monthCount >= 2 && present >= 2 && baseAvg !== null && baseAvg > 0;
    out.push({
      category: cat as ExpenseCategoryDto,
      currency: primaryCurrency,
      currentTotal: round2(total),
      currentCount: count,
      comparableHistoricAvg: baseAvg !== null ? round2(baseAvg) : null,
      percentVsHistoric: showDelta ? Math.round(((total - (baseAvg as number)) / (baseAvg as number)) * 100) : null,
    });
  }
  return out.sort((a, b) => b.currentTotal - a.currentTotal);
}

function computeTopCharges(monthExpensesPrimary: ReadonlyArray<Expense>, limit: number): ExpenseChargeDto[] {
  return [...monthExpensesPrimary]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((e) => ({
      id: e._id!.toString(),
      vendor: effectiveVendor(e),
      amount: round2(e.amount),
      currency: e.currency,
      transactionDate: e.transactionDate.toISOString(),
      category: effectiveCategory(e) as ExpenseCategoryDto,
    }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
  app.post('/api/chatbot/expenses', (req: Request, res: Response<{ logged: true } | { error: string }>) => {
    notify(BOT_CONFIG, { action: 'expense_received', body: req.body });
    const expectedToken = env.EXPENSES_INGEST_TOKEN;
    if (!expectedToken) {
      logger.error('EXPENSES_INGEST_TOKEN not configured');
      res.status(500).json({ error: 'ingest_not_configured' });
      return;
    }
    const auth = req.header('authorization') ?? '';
    const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
    if (provided !== expectedToken) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const parsed = parseExpensePayload(req.body);
    if (!parsed.vendor) {
      res.status(400).json({ error: 'vendor_required' });
      return;
    }
    if (parsed.amount === null) {
      res.status(400).json({ error: 'amount_required' });
      return;
    }
    if (parsed.currency && !SUPPORTED_CURRENCIES.includes(parsed.currency)) {
      res.status(400).json({ error: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` });
      return;
    }
    addExpenseToDailyLog({ vendor: parsed.vendor, amount: parsed.amount, currency: parsed.currency ?? DEFAULT_CURRENCY });
    res.status(202).json({ logged: true });
  });

  app.use('/api/chatbot', chatbotAuthMiddleware);

  app.get('/api/chatbot/dashboard', async (req: Request, res: Response<DashboardResponse | { error: string }>) => {
    try {
      const { chatId } = req.chatbotUser!;
      const now = new Date();
      const selectedDate = parseSelectedDate(req.query.date);
      const selectedKey = dateKey(selectedDate);
      const isToday = selectedKey === dateKey(now);
      const selectedDayEnd = addDays(selectedDate, 1);

      const [weather, googleEvents, pendingReminders, completedReminders, activity, dayExpenses] = await Promise.all([
        isToday ? buildWeatherSnapshot() : Promise.resolve(null),
        fetchEventsForDate(selectedDate),
        getPendingRemindersDueOnOrBefore(chatId, selectedDayEnd),
        getRemindersCompletedBetween(chatId, selectedDate, selectedDayEnd),
        buildActivitySummary(chatId),
        getExpensesBetween(selectedDate, selectedDayEnd).catch((err) => {
          logger.warn(`Failed to fetch expenses for ${selectedKey}: ${err}`);
          return [] as Expense[];
        }),
      ]);

      const eventDtos = googleEvents.map((event, idx) => toEventDto(event, `event-${idx}`));
      const birthdays = eventDtos.filter((e) => e.isBirthday);
      const events = eventDtos.filter((e) => !e.isBirthday);
      const reminders = [...pendingReminders, ...completedReminders];

      res.json({
        date: selectedKey,
        isToday,
        weather,
        birthdays,
        events,
        reminders: reminders.map(toReminderDto),
        activity,
        expenses: dayExpenses.map(toExpenseDto),
        expenseTotals: totalsByCurrency(dayExpenses),
      });
    } catch (err) {
      logger.error(`dashboard failed: ${err}`);
      res.status(500).json({ error: 'dashboard_failed' });
    }
  });

  app.get('/api/chatbot/expenses', async (req: Request, res: Response<ExpensesMonthResponse | { error: string }>) => {
    try {
      const { ym, start, endExclusive, daysInMonth } = (() => {
        const parsed = parseSelectedMonth(req.query.month);
        return { ...parsed, daysInMonth: getMonthBoundaries(parsed.ym).daysInMonth };
      })();

      // Fetch a single range covering the selected month + 3 prior baseline months.
      const baselineStart = getMonthBoundaries(prevYm(ym, 3)).start;
      const fetchStart = start < baselineStart ? start : baselineStart;
      const fetchEnd = endExclusive;

      const allExpenses = await getExpensesBetween(fetchStart, fetchEnd);
      const monthExpenses = allExpenses.filter((e) => e.transactionDate >= start && e.transactionDate < endExclusive);
      const baselineFetched = allExpenses.filter((e) => e.transactionDate < start);

      const todayYm = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM');
      const isCurrentMonth = ym === todayYm;
      const isPastMonth = ym < todayYm;
      const todayDayOfMonth = zonedDayOfMonth(new Date());

      const primaryCurrency = pickPrimaryCurrency(monthExpenses.length > 0 ? monthExpenses : baselineFetched);
      const monthExpensesPrimary = monthExpenses.filter((e) => e.currency === primaryCurrency);

      const throughDayForBaseline = isPastMonth ? daysInMonth : Math.min(todayDayOfMonth, daysInMonth);
      const baseline = buildBaseline(baselineFetched, ym, throughDayForBaseline, primaryCurrency);

      const pace = computePace(monthExpensesPrimary, baseline, primaryCurrency, ym, daysInMonth, isCurrentMonth, todayDayOfMonth);
      const trajectory = buildTrajectory(monthExpensesPrimary, baseline, daysInMonth, isCurrentMonth, todayDayOfMonth);
      const categoryDeltas = enrichCategoryDeltas(monthExpensesPrimary, baseline, primaryCurrency);
      const topCharges = computeTopCharges(monthExpensesPrimary, 5);

      const sorted = [...monthExpenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

      res.json({
        month: ym,
        expenses: sorted.map(toExpenseDto),
        totals: totalsByCurrency(sorted),
        byCategory: categoryBreakdown(sorted),
        byType: typeBreakdown(sorted),
        pace,
        trajectory,
        categoryDeltas,
        topCharges,
      });
    } catch (err) {
      logger.error(`expenses month failed: ${err}`);
      res.status(500).json({ error: 'expenses_failed' });
    }
  });

  app.get('/api/chatbot/expenses/category/:category', async (req: Request, res: Response<ExpenseCategoryDetailResponse | { error: string }>) => {
    try {
      const raw = req.params.category;
      if (!EXPENSE_CATEGORIES.includes(raw as ExpenseCategory)) {
        res.status(400).json({ error: 'invalid_category' });
        return;
      }
      const category = raw as ExpenseCategory;
      const expenses = await getAllExpensesByEffectiveCategory(category);
      res.json(buildCategoryDetail(category, expenses));
    } catch (err) {
      logger.error(`expenses category failed: ${err}`);
      res.status(500).json({ error: 'category_failed' });
    }
  });

  app.get('/api/chatbot/expenses/vendor', async (req: Request, res: Response<ExpenseVendorDetailResponse | { error: string }>) => {
    try {
      const raw = req.query.name;
      const name = typeof raw === 'string' ? raw.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'missing_name' });
        return;
      }
      const expenses = await getAllExpensesByEffectiveVendor(name);
      res.json(buildVendorDetail(name, expenses));
    } catch (err) {
      logger.error(`expenses vendor failed: ${err}`);
      res.status(500).json({ error: 'vendor_failed' });
    }
  });

  app.patch('/api/chatbot/expenses/vendor', async (req: Request<object, object, BulkUpdateVendorBody>, res: Response<BulkUpdateVendorResponse | { error: string }>) => {
    try {
      const body = req.body ?? ({} as BulkUpdateVendorBody);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'missing_name' });
        return;
      }
      if (body.userVendor !== undefined && body.userVendor !== null && typeof body.userVendor !== 'string') {
        res.status(400).json({ error: 'invalid_vendor' });
        return;
      }
      if (body.userCategory !== undefined && body.userCategory !== null && !EXPENSE_CATEGORIES.includes(body.userCategory)) {
        res.status(400).json({ error: 'invalid_category' });
        return;
      }
      if (body.userVendor === undefined && body.userCategory === undefined) {
        res.status(400).json({ error: 'no_updates' });
        return;
      }
      const modifiedCount = await bulkUpdateExpensesByEffectiveVendor(name, {
        userVendor: body.userVendor === undefined ? undefined : body.userVendor,
        userCategory: body.userCategory === undefined ? undefined : body.userCategory,
      });
      // After rename, the lookup name changes — use new userVendor (if provided and not null) for the refreshed payload.
      const refreshedName = typeof body.userVendor === 'string' && body.userVendor.trim() ? body.userVendor.trim() : name;
      const expenses = await getAllExpensesByEffectiveVendor(refreshedName);
      if (expenses.length === 0 && modifiedCount === 0) {
        res.status(404).json({ error: 'vendor_not_found' });
        return;
      }
      res.json({ modifiedCount, vendor: buildVendorDetail(refreshedName, expenses) });
    } catch (err) {
      logger.error(`expenses vendor bulk-update failed: ${err}`);
      res.status(500).json({ error: 'bulk_update_failed' });
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
      logger.error(`calendar event delete failed: ${err}`);
      res.status(500).json({ error: 'delete_failed' });
    }
  });

  app.patch('/api/chatbot/expenses/:id', async (req: Request<{ id: string }, object, UpdateExpenseBody>, res: Response<ExpenseDto | { error: string }>) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }
      const body = req.body ?? {};
      if (body.userCategory !== undefined && body.userCategory !== null && !EXPENSE_CATEGORIES.includes(body.userCategory)) {
        res.status(400).json({ error: 'invalid_category' });
        return;
      }
      if (body.userType !== undefined && body.userType !== null && !EXPENSE_TYPES.includes(body.userType)) {
        res.status(400).json({ error: 'invalid_type' });
        return;
      }
      if (body.userVendor !== undefined && body.userVendor !== null && typeof body.userVendor !== 'string') {
        res.status(400).json({ error: 'invalid_vendor' });
        return;
      }
      const updated = await updateUserOverrides(id, {
        userVendor: body.userVendor === undefined ? undefined : body.userVendor,
        userCategory: body.userCategory === undefined ? undefined : body.userCategory,
        userType: body.userType === undefined ? undefined : body.userType,
      });
      if (!updated) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(toExpenseDto(updated));
    } catch (err) {
      logger.error(`expense update failed: ${err}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.post('/api/chatbot/expenses/manual', async (req: Request<object, object, CreateManualExpenseBody>, res: Response<ExpenseDto | { error: string }>) => {
    try {
      const body = req.body ?? ({} as CreateManualExpenseBody);
      const vendor = typeof body.vendor === 'string' ? body.vendor.trim() : '';
      if (!vendor) {
        res.status(400).json({ error: 'vendor_required' });
        return;
      }
      if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
        res.status(400).json({ error: 'amount_must_be_positive_number' });
        return;
      }
      if (body.currency && !SUPPORTED_CURRENCIES.includes(body.currency as Currency)) {
        res.status(400).json({ error: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` });
        return;
      }
      if (body.category !== undefined && !EXPENSE_CATEGORIES.includes(body.category)) {
        res.status(400).json({ error: 'invalid_category' });
        return;
      }
      let transactionDate: Date | undefined;
      if (body.transactionDate) {
        const d = new Date(body.transactionDate);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ error: 'invalid_transactionDate' });
          return;
        }
        transactionDate = d;
      }
      const created = await createManualExpense({
        vendor,
        amount: body.amount,
        currency: (body.currency as Currency) ?? undefined,
        transactionDate,
        category: body.category,
      });
      res.status(201).json(toExpenseDto(created));
    } catch (err) {
      logger.error(`manual expense create failed: ${err}`);
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
