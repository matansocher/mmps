import { tool } from '@langchain/core/tools';
import { subDays } from 'date-fns';
import { z } from 'zod';
import {
  buildDailySummary,
  buildMonthlyAnalyticsSummary,
  buildVendorTrends,
  buildYesterdaySummary,
  createManualExpense,
  EXPENSE_CATEGORIES,
  formatAmount,
  formatPeriodSummary,
  getMonthlyExpenses,
  getWeeklyExpenses,
  totalsByCategory,
} from '@shared/expenses';
import { getExpensesByCategory, getExpensesByVendor, getRecentExpenses, updateUserCategory } from '@shared/expenses/mongo/expenses.repository';
import type { Expense, ExpenseCategory } from '@shared/expenses/types';

const CATEGORY_TUPLE = EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]];

const schema = z.object({
  action: z
    .enum(['today', 'yesterday', 'week', 'month', 'byCategory', 'byVendor', 'recent', 'analytics', 'vendorTrends', 'setCategory', 'addManual'])
    .describe('Which expense action to perform'),
  category: z.enum(CATEGORY_TUPLE).optional().describe('Required for byCategory and setCategory'),
  vendor: z.string().optional().describe('Required for byVendor (substring) and addManual (vendor name)'),
  amount: z.number().optional().describe('Required for addManual — positive number, assumed ILS'),
  expenseId: z.string().optional().describe('Required for setCategory — Mongo ObjectId of the expense'),
  limit: z.number().optional().describe('Max rows for recent/byVendor (default 20)'),
  monthsBack: z.number().optional().describe('How many months back for vendorTrends (default 6)'),
});

function renderExpenseRows(expenses: ReadonlyArray<Expense>): string {
  return expenses
    .map((e) => {
      const iso = e.transactionDate.toISOString().slice(0, 10);
      const cat = e.userCategory ?? e.category;
      const overridden = e.userCategory ? ' *' : '';
      return `- ${iso} · ${e.vendor} · ${formatAmount(e.amount, e.currency)} · ${cat}${overridden} · id:${e._id?.toString() ?? '?'}`;
    })
    .join('\n');
}

async function runner({ action, category, vendor, amount, expenseId, limit = 20, monthsBack = 6 }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'today': {
        const summary = await buildDailySummary();
        return summary.text;
      }
      case 'yesterday': {
        const summary = await buildYesterdaySummary();
        return summary.text;
      }
      case 'week': {
        const expenses = await getWeeklyExpenses();
        return formatPeriodSummary('This week', expenses);
      }
      case 'month': {
        const expenses = await getMonthlyExpenses();
        return formatPeriodSummary('This month', expenses);
      }
      case 'analytics': {
        const result = await buildMonthlyAnalyticsSummary();
        return result.text;
      }
      case 'vendorTrends': {
        const trends = await buildVendorTrends(new Date(), monthsBack, 5);
        if (trends.length === 0) return 'No vendor history yet.';
        const lines: string[] = [`*Vendor trends — last ${monthsBack} months*`, ''];
        for (const t of trends) {
          lines.push(`*${t.vendor}* — total ${formatAmount(t.totalAllMonths, t.currency)}`);
          for (const m of t.months) {
            lines.push(`  ${m.month}: ${formatAmount(m.total, t.currency)} (${m.count})`);
          }
          lines.push('');
        }
        return lines.join('\n').trimEnd();
      }
      case 'byCategory': {
        if (!category) return JSON.stringify({ success: false, error: 'category required for byCategory' });
        const to = new Date();
        const from = subDays(to, 30);
        const expenses = await getExpensesByCategory(category, from, to);
        if (expenses.length === 0) return `No "${category}" expenses in the last 30 days.`;
        const totals = totalsByCategory(expenses);
        const totalLine = totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
        return [`*${category} — last 30 days*`, `_${expenses.length} transactions · ${totalLine}_`, '', renderExpenseRows(expenses)].join('\n');
      }
      case 'byVendor': {
        if (!vendor) return JSON.stringify({ success: false, error: 'vendor required for byVendor' });
        const expenses = await getExpensesByVendor(vendor, limit);
        if (expenses.length === 0) return `No expenses found for vendor "${vendor}".`;
        const totals = totalsByCategory(expenses);
        const totalLine = totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
        return [`*${vendor} — most recent*`, `_${expenses.length} transactions · ${totalLine}_`, '', renderExpenseRows(expenses)].join('\n');
      }
      case 'recent': {
        const expenses = await getRecentExpenses(limit);
        if (expenses.length === 0) return 'No expenses recorded yet.';
        return [`*Recent expenses (${expenses.length})*`, '', renderExpenseRows(expenses)].join('\n');
      }
      case 'setCategory': {
        if (!expenseId) return JSON.stringify({ success: false, error: 'expenseId required for setCategory' });
        if (!category) return JSON.stringify({ success: false, error: 'category required for setCategory' });
        const updated = await updateUserCategory(expenseId, category);
        if (!updated) return JSON.stringify({ success: false, error: 'expense not found' });
        return `Updated ${updated.vendor} (${formatAmount(updated.amount, updated.currency)}) to category "${category}".`;
      }
      case 'addManual': {
        if (!vendor) return JSON.stringify({ success: false, error: 'vendor required for addManual' });
        if (!amount || amount <= 0) return JSON.stringify({ success: false, error: 'positive amount required for addManual' });
        const created = await createManualExpense({ vendor, amount });
        return `Added expense: ${created.vendor} — ${formatAmount(created.amount, created.currency)} · category "${created.category}" · type "${created.type}" · id:${created._id?.toString()}`;
      }
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err instanceof Error ? err.message : String(err)}` });
  }
}

export const expensesTool = tool(runner, {
  name: 'expenses',
  description: `Query and manage the user's tracked expenses. Expenses are added manually via API/tool entries and stored in MongoDB.

Actions:
- today / yesterday: summary for that day (totals, by category, top vendors, transactions)
- week: This week (Sunday → today)
- month: This calendar month
- analytics: Current month — totals, month-over-month deltas, top categories, top vendors
- vendorTrends: Top vendors across last N months (monthsBack, default 6) with per-month totals
- byCategory: Pass category — last 30 days for that category
- byVendor: Pass vendor (substring) — most recent N transactions
- recent: Most recent N expenses
- setCategory: Override a single expense's category. Pass expenseId + category. Useful when the user says "the wolt one was actually groceries".
- addManual: Add a manually entered expense. Pass vendor + amount (positive ILS number). The category and type are inferred automatically.

Use this tool whenever the user asks about spending, expenses, bills, receipts, "how much did I spend on X", "what did I buy", "add expense at X for Y", or to re-categorize an expense.`,
  schema,
});
