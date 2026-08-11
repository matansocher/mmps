import { addDays, subMonths } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { UserDetails } from '@services/telegram';
import {
  bulkUpdateExpensesByEffectiveVendor,
  computeAnomalies,
  createManualExpense,
  type Currency,
  DEFAULT_CURRENCY,
  detectSubscriptions,
  type Expense,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseType,
  getAllExpenses,
  getAllExpensesByEffectiveCategory,
  getAllExpensesByEffectiveVendor,
  getDistinctCards,
  getExpensesBetween,
  searchExpenses,
  SUPPORTED_CURRENCIES,
} from '@shared/expenses';
import { updateUserOverrides } from '@shared/expenses/mongo/expenses.repository';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../expenses.config';
import { buildBaseline, enrichCategoryDeltas, getMonthBoundaries, parseSelectedMonth, prevYm, zonedDayOfMonth } from './analytics';
import { expensesAuthMiddleware } from './auth.middleware';
import { NOTES_MAX_LENGTH } from './dto';
import type {
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CardListResponse,
  CreateManualExpenseBody,
  ExpenseCategoryDetailResponse,
  ExpenseDto,
  ExpensesMonthResponse,
  ExpenseVendorDetailResponse,
  SubscriptionDto,
  UpdateExpenseBody,
} from './dto';
import { buildCategoryDetail, buildVendorDetail, categoryBreakdown, computeTopCharges, pickPrimaryCurrency, toExpenseDto, toSubscriptionDto, totalsByCurrency, typeBreakdown } from './transformers';

const logger = new Logger('expenses:api');

const EXPENSE_TYPES: ReadonlyArray<ExpenseType> = ['receipt', 'card_alert', 'bill'];

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

  app.get('/api/expenses/search', async (req: Request, res: Response<{ expenses: ReadonlyArray<ExpenseDto> } | { error: string }>) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      if (q.trim().length < 2) {
        res.json({ expenses: [] });
        return;
      }
      const rows = await searchExpenses(q, 50);
      res.json({ expenses: rows.map(toExpenseDto) });
    } catch (err) {
      logger.error(`search failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'search_failed' });
    }
  });

  app.get('/api/expenses/subscriptions', async (_req: Request, res: Response<{ subscriptions: ReadonlyArray<SubscriptionDto> } | { error: string }>) => {
    try {
      const to = new Date();
      const from = subMonths(to, 12);
      const window = await getExpensesBetween(from, addDays(to, 1));
      const subs = detectSubscriptions(window);
      const dto: SubscriptionDto[] = subs.map(toSubscriptionDto);
      res.json({ subscriptions: dto });
    } catch (err) {
      logger.error(`subscriptions failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'subscriptions_failed' });
    }
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
          anomalyExpenseIds: [],
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
      const anomalyExpenseIds = computeAnomalies(monthExpenses, baselineFetched).map((e) => e._id!.toString());

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
        anomalyExpenseIds,
      });
    } catch (err) {
      logger.error(`expenses month failed: ${getErrorMessage(err)}`);
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
      logger.error(`expenses category failed: ${getErrorMessage(err)}`);
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
      logger.error(`expenses vendor failed: ${getErrorMessage(err)}`);
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
      logger.error(`expenses vendor bulk-update failed: ${getErrorMessage(err)}`);
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
      if (body.notes !== undefined && body.notes !== null) {
        if (typeof body.notes !== 'string') {
          res.status(400).json({ error: 'invalid_notes' });
          return;
        }
        if (body.notes.length > NOTES_MAX_LENGTH) {
          res.status(400).json({ error: 'notes_too_long' });
          return;
        }
      }
      const updated = await updateUserOverrides(id, {
        userVendor: body.userVendor === undefined ? undefined : body.userVendor,
        userCategory: body.userCategory === undefined ? undefined : body.userCategory,
        userType: body.userType === undefined ? undefined : body.userType,
        notes: body.notes === undefined ? undefined : body.notes,
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
      logger.error(`expense update failed: ${getErrorMessage(err)}`);
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
      logger.error(`manual expense create failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'create_failed' });
    }
  });

  app.get('/api/expenses/cards', async (_req: Request, res: Response<CardListResponse | { error: string }>) => {
    try {
      const cards = await getDistinctCards();
      res.json({ cards });
    } catch (err) {
      logger.error(`list cards failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'list_failed' });
    }
  });

  logger.log('Expenses API routes registered at /api/expenses/*');
}
