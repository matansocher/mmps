import { createJsonRequester } from '@mmps/web-api';
import type {
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CreateManualExpenseBody,
  ExpenseCategory,
  ExpenseCategoryDetailResponse,
  ExpenseDto,
  ExpensesMonthResponse,
  ExpenseVendorDetailResponse,
  SubscriptionDto,
  UpdateExpenseBody,
} from '../types';
import { getInitData } from './telegram';

const request = createJsonRequester({
  headers: () => ({
    'X-Telegram-Init-Data': getInitData(),
  }),
});

export const api = {
  expensesMonth: (month?: string) => request<ExpensesMonthResponse>(`/api/expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  expenseCategory: (category: ExpenseCategory, month?: string) =>
    request<ExpenseCategoryDetailResponse>(`/api/expenses/category/${encodeURIComponent(category)}${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  expenseVendor: (name: string) => request<ExpenseVendorDetailResponse>(`/api/expenses/vendor?name=${encodeURIComponent(name)}`),
  bulkUpdateVendor: (body: BulkUpdateVendorBody) => request<BulkUpdateVendorResponse>('/api/expenses/vendor', { method: 'PATCH', body: JSON.stringify(body) }),
  updateExpense: (id: string, body: UpdateExpenseBody) => request<ExpenseDto>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createManualExpense: (body: CreateManualExpenseBody) => request<ExpenseDto>('/api/expenses/manual', { method: 'POST', body: JSON.stringify(body) }),
  listCards: () => request<{ cards: ReadonlyArray<string> }>('/api/expenses/cards').then((r) => r.cards),
  searchExpenses: (q: string) => request<{ expenses: ReadonlyArray<ExpenseDto> }>(`/api/expenses/search?q=${encodeURIComponent(q)}`).then((r) => r.expenses),
  subscriptions: () => request<{ subscriptions: ReadonlyArray<SubscriptionDto> }>('/api/expenses/subscriptions').then((r) => r.subscriptions),
  notifyMiniAppOpened: () => request<void>('/api/expenses/session/open', { method: 'POST' }),
};
