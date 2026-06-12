import { addDays, endOfMonth, subMonths } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { UserDetails } from '@services/telegram';
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
  getAllExpenses,
  getAllExpensesByEffectiveCategory,
  getAllExpensesByEffectiveVendor,
  getDistinctCards,
  getExpensesBetween,
  SUPPORTED_CURRENCIES,
} from '@shared/expenses';
import { updateUserOverrides } from '@shared/expenses/mongo/expenses.repository';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../expenses.config';
import { expensesAuthMiddleware } from './auth.middleware';
import type {
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CardListResponse,
  CreateManualExpenseBody,
  ExpenseCategoryBreakdown,
  ExpenseCategoryDelta,
  ExpenseCategoryDetailResponse,
  ExpenseCategoryDto,
  ExpenseChargeDto,
  ExpenseDto,
  ExpenseMonthlyPoint,
  ExpensesMonthResponse,
  ExpenseTotal,
  ExpenseTypeBreakdown,
  ExpenseTypeDto,
  ExpenseVendorDetailResponse,
  UpdateExpenseBody,
} from './dto';

const logger = new Logger('ExpensesApiController');

const EXPENSE_TYPES: ReadonlyArray<ExpenseType> = ['receipt', 'card_alert', 'bill'];

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
    ...(e.card ? { card: e.card } : {}),
    originalVendor: e.userVendor && e.vendor !== e.userVendor ? e.vendor : undefined,
    originalCategory: e.userCategory && e.category !== e.userCategory ? (e.category as ExpenseCategoryDto) : undefined,
    originalType: e.userType && e.type !== e.userType ? (e.type as ExpenseTypeDto) : undefined,
  };
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

function buildCategoryDetail(
  category: ExpenseCategory,
  expenses: ReadonlyArray<Expense>,
  scopeMonth: string | null,
  monthlyContextExpenses?: ReadonlyArray<Expense>,
): ExpenseCategoryDetailResponse {
  const sorted = [...expenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  const primaryCurrency = pickPrimaryCurrency(sorted.length > 0 ? sorted : monthlyContextExpenses ?? []);
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

  const barsSource = monthlyContextExpenses ?? sorted;

  return {
    category: category as ExpenseCategoryDto,
    scope: scopeMonth ? 'month' : 'all',
    month: scopeMonth,
    currency: primaryCurrency,
    total: Math.round(total * 100) / 100,
    count,
    avg: Math.round(avg * 100) / 100,
    firstDate,
    lastDate,
    totals: totalsByCurrency(sorted),
    monthlyTotals: monthlyTotalsForCurrency(barsSource, primaryCurrency, 12),
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
  readonly expenses: ReadonlyArray<Expense>;
};

type Baseline = {
  readonly monthCount: number;
  readonly months: ReadonlyArray<BaselineMonth>;
  readonly avgFullMonthTotal: number;
  readonly avgToDateTotal: number;
  readonly byCategoryAvg: Map<string, number>;
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

function enrichCategoryDeltas(monthExpensesPrimary: ReadonlyArray<Expense>, baseline: Baseline | null, primaryCurrency: string): ExpenseCategoryDelta[] {
  const totals = new Map<string, { total: number; count: number }>();
  for (const e of monthExpensesPrimary) {
    const cat = effectiveCategory(e) as string;
    const cur = totals.get(cat) ?? { total: 0, count: 0 };
    totals.set(cat, { total: cur.total + e.amount, count: cur.count + 1 });
  }
  const out: ExpenseCategoryDelta[] = [];
  for (const [cat, { total, count }] of totals) {
    const baseAvg = baseline?.byCategoryAvg.get(cat) ?? null;
    const present = baseline?.byCategoryMonthsPresent.get(cat) ?? 0;
    const showDelta = !!baseline && baseline.monthCount >= 2 && present >= 2 && baseAvg !== null && baseAvg > 0;
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
      ...(e.card ? { card: e.card } : {}),
    }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toUserDetails(req: Pick<Request, 'expensesUser'>): UserDetails | undefined {
  const u = req.expensesUser;
  if (!u) return undefined;
  return {
    chatId: u.chatId,
    telegramUserId: u.telegramUserId,
    firstName: u.firstName ?? '',
    lastName: '',
    username: u.username ?? '',
  };
}

export function registerExpensesApiRoutes(app: Express): void {
  app.use('/api/expenses', expensesAuthMiddleware);

  app.post('/api/expenses/session/open', (req: Request, res: Response) => {
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MINI_APP_OPENED }, toUserDetails(req));
    res.status(204).end();
  });

  app.get('/api/expenses', async (req: Request, res: Response<ExpensesMonthResponse | { error: string }>) => {
    try {
      const rawMonth = typeof req.query.month === 'string' ? req.query.month.trim() : '';
      const isAllTime = rawMonth.toLowerCase() === 'all';

      if (isAllTime) {
        const allExpensesFull = await getAllExpenses();
        const primaryCurrency = pickPrimaryCurrency(allExpensesFull);
        const primary = allExpensesFull.filter((e) => e.currency === primaryCurrency);
        const sorted = [...allExpensesFull].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
        const categoryDeltas = enrichCategoryDeltas(primary, null, primaryCurrency);
        const topCharges = computeTopCharges(primary, 5);
        res.json({
          month: 'all',
          scope: 'all',
          currency: primaryCurrency,
          expenses: sorted.map(toExpenseDto),
          totals: totalsByCurrency(sorted),
          byCategory: categoryBreakdown(sorted),
          byType: typeBreakdown(sorted),
          categoryDeltas,
          topCharges,
        });
        return;
      }

      const { ym, start, endExclusive } = parseSelectedMonth(req.query.month);

      const baselineStart = getMonthBoundaries(prevYm(ym, 3)).start;
      const fetchStart = start < baselineStart ? start : baselineStart;
      const fetchEnd = endExclusive;

      const allExpenses = await getExpensesBetween(fetchStart, fetchEnd);
      const monthExpenses = allExpenses.filter((e) => e.transactionDate >= start && e.transactionDate < endExclusive);
      const baselineFetched = allExpenses.filter((e) => e.transactionDate < start);

      const todayYm = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM');
      const isPastMonth = ym < todayYm;
      const todayDayOfMonth = zonedDayOfMonth(new Date());
      const { daysInMonth } = getMonthBoundaries(ym);

      const primaryCurrency = pickPrimaryCurrency(monthExpenses.length > 0 ? monthExpenses : baselineFetched);
      const monthExpensesPrimary = monthExpenses.filter((e) => e.currency === primaryCurrency);

      const throughDayForBaseline = isPastMonth ? daysInMonth : Math.min(todayDayOfMonth, daysInMonth);
      const baseline = buildBaseline(baselineFetched, ym, throughDayForBaseline, primaryCurrency);

      const categoryDeltas = enrichCategoryDeltas(monthExpensesPrimary, baseline, primaryCurrency);
      const topCharges = computeTopCharges(monthExpensesPrimary, 5);

      const sorted = [...monthExpenses].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

      res.json({
        month: ym,
        scope: 'month',
        currency: primaryCurrency,
        expenses: sorted.map(toExpenseDto),
        totals: totalsByCurrency(sorted),
        byCategory: categoryBreakdown(sorted),
        byType: typeBreakdown(sorted),
        categoryDeltas,
        topCharges,
      });
    } catch (err) {
      logger.error(`expenses month failed: ${err}`);
      res.status(500).json({ error: 'expenses_failed' });
    }
  });

  app.get('/api/expenses/category/:category', async (req: Request, res: Response<ExpenseCategoryDetailResponse | { error: string }>) => {
    try {
      const raw = req.params.category;
      if (!EXPENSE_CATEGORIES.includes(raw as ExpenseCategory)) {
        res.status(400).json({ error: 'invalid_category' });
        return;
      }
      const category = raw as ExpenseCategory;
      const rawMonth = typeof req.query.month === 'string' ? req.query.month.trim() : '';
      const scopeMonth = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : null;

      const allCategoryExpenses = await getAllExpensesByEffectiveCategory(category);
      let scoped: ReadonlyArray<Expense> = allCategoryExpenses;
      if (scopeMonth) {
        const { start, endExclusive } = getMonthBoundaries(scopeMonth);
        scoped = allCategoryExpenses.filter((e) => e.transactionDate >= start && e.transactionDate < endExclusive);
      }
      res.json(buildCategoryDetail(category, scoped, scopeMonth, allCategoryExpenses));
    } catch (err) {
      logger.error(`expenses category failed: ${err}`);
      res.status(500).json({ error: 'category_failed' });
    }
  });

  app.get('/api/expenses/vendor', async (req: Request, res: Response<ExpenseVendorDetailResponse | { error: string }>) => {
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

  app.patch('/api/expenses/vendor', async (req: Request<object, object, BulkUpdateVendorBody>, res: Response<BulkUpdateVendorResponse | { error: string }>) => {
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
      const refreshedName = typeof body.userVendor === 'string' && body.userVendor.trim() ? body.userVendor.trim() : name;
      const expenses = await getAllExpensesByEffectiveVendor(refreshedName);
      if (expenses.length === 0 && modifiedCount === 0) {
        res.status(404).json({ error: 'vendor_not_found' });
        return;
      }
      res.json({ modifiedCount, vendor: buildVendorDetail(refreshedName, expenses) });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.API_VENDOR_UPDATE, vendor: name, userVendor: body.userVendor, userCategory: body.userCategory, modifiedCount }, toUserDetails(req));
    } catch (err) {
      logger.error(`expenses vendor bulk-update failed: ${err}`);
      res.status(500).json({ error: 'bulk_update_failed' });
    }
  });

  app.patch('/api/expenses/:id', async (req: Request<{ id: string }, object, UpdateExpenseBody>, res: Response<ExpenseDto | { error: string }>) => {
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
      notify(
        BOT_CONFIG,
        { action: ANALYTIC_EVENT_NAMES.API_EXPENSE_UPDATE, id, fields: Object.keys(body), userVendor: body.userVendor, userCategory: body.userCategory, userType: body.userType },
        toUserDetails(req),
      );
    } catch (err) {
      logger.error(`expense update failed: ${err}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.post('/api/expenses/manual', async (req: Request<object, object, CreateManualExpenseBody>, res: Response<ExpenseDto | { error: string }>) => {
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
      let card: string | undefined;
      if (body.card !== undefined && body.card !== null && body.card !== '') {
        if (typeof body.card !== 'string' || !/^\d{4}$/.test(body.card)) {
          res.status(400).json({ error: 'card_must_be_4_digits' });
          return;
        }
        card = body.card;
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
        card,
      });
      res.status(201).json(toExpenseDto(created));
      notify(
        BOT_CONFIG,
        { action: ANALYTIC_EVENT_NAMES.API_MANUAL_EXPENSE, vendor, amount: body.amount, currency: body.currency ?? DEFAULT_CURRENCY, category: body.category, card },
        toUserDetails(req),
      );
    } catch (err) {
      logger.error(`manual expense create failed: ${err}`);
      res.status(500).json({ error: 'create_failed' });
    }
  });

  app.get('/api/expenses/cards', async (_req: Request, res: Response<CardListResponse | { error: string }>) => {
    try {
      const cards = await getDistinctCards();
      res.json({ cards });
    } catch (err) {
      logger.error(`list cards failed: ${err}`);
      res.status(500).json({ error: 'list_failed' });
    }
  });

  logger.log('Expenses API routes registered at /api/expenses/*');
}
