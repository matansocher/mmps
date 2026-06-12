import { getInitData } from './telegram';
import type {
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CreateManualExpenseBody,
  ExpenseCategory,
  ExpenseCategoryDetailResponse,
  ExpenseDto,
  ExpensesMonthResponse,
  ExpenseVendorDetailResponse,
  UpdateExpenseBody,
} from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'X-Telegram-Init-Data': getInitData(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`request_failed_${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  expensesMonth: (month?: string) => request<ExpensesMonthResponse>(`/api/expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  expenseCategory: (category: ExpenseCategory, month?: string) =>
    request<ExpenseCategoryDetailResponse>(`/api/expenses/category/${encodeURIComponent(category)}${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  expenseVendor: (name: string) => request<ExpenseVendorDetailResponse>(`/api/expenses/vendor?name=${encodeURIComponent(name)}`),
  bulkUpdateVendor: (body: BulkUpdateVendorBody) =>
    request<BulkUpdateVendorResponse>('/api/expenses/vendor', { method: 'PATCH', body: JSON.stringify(body) }),
  updateExpense: (id: string, body: UpdateExpenseBody) =>
    request<ExpenseDto>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createManualExpense: (body: CreateManualExpenseBody) =>
    request<ExpenseDto>('/api/expenses/manual', { method: 'POST', body: JSON.stringify(body) }),
  listCards: () => request<{ cards: ReadonlyArray<string> }>('/api/expenses/cards').then((r) => r.cards),
};
