import { getInitData } from './telegram';
import type {
  BulkUpdateVendorBody,
  BulkUpdateVendorResponse,
  CreateManualExpenseBody,
  CreateReminderBody,
  DashboardResponse,
  ExerciseLogResponse,
  ExpenseCategory,
  ExpenseCategoryDetailResponse,
  ExpenseDto,
  ExpensesMonthResponse,
  ExpenseVendorDetailResponse,
  ReminderDto,
  UpdateExpenseBody,
  UpdateReminderBody,
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
  dashboard: (date?: string) => request<DashboardResponse>(`/api/chatbot/dashboard${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  expensesMonth: (month?: string) => request<ExpensesMonthResponse>(`/api/chatbot/expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  expenseCategory: (category: ExpenseCategory) =>
    request<ExpenseCategoryDetailResponse>(`/api/chatbot/expenses/category/${encodeURIComponent(category)}`),
  expenseVendor: (name: string) =>
    request<ExpenseVendorDetailResponse>(`/api/chatbot/expenses/vendor?name=${encodeURIComponent(name)}`),
  bulkUpdateVendor: (body: BulkUpdateVendorBody) =>
    request<BulkUpdateVendorResponse>('/api/chatbot/expenses/vendor', { method: 'PATCH', body: JSON.stringify(body) }),
  logExercise: () => request<ExerciseLogResponse>('/api/chatbot/exercise/log', { method: 'POST' }),
  createReminder: (body: CreateReminderBody) =>
    request<ReminderDto>('/api/chatbot/reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateReminder: (id: string, body: UpdateReminderBody) =>
    request<ReminderDto>(`/api/chatbot/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteReminder: (id: string) => request<void>(`/api/chatbot/reminders/${id}`, { method: 'DELETE' }),
  deleteCalendarEvent: (id: string) => request<void>(`/api/chatbot/calendar/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateExpense: (id: string, body: UpdateExpenseBody) =>
    request<ExpenseDto>(`/api/chatbot/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createManualExpense: (body: CreateManualExpenseBody) =>
    request<ExpenseDto>('/api/chatbot/expenses/manual', { method: 'POST', body: JSON.stringify(body) }),
  listCards: () => request<{ cards: ReadonlyArray<string> }>('/api/chatbot/expenses/cards').then((r) => r.cards),
};
