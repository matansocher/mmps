import { getInitData } from './telegram';
import type {
  CreateReminderBody,
  DashboardResponse,
  ExerciseLogResponse,
  ExerciseResponse,
  ExpenseDto,
  ExpensesMonthResponse,
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
  exercise: () => request<ExerciseResponse>('/api/chatbot/exercise'),
  expensesMonth: (month?: string) => request<ExpensesMonthResponse>(`/api/chatbot/expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`),
  logExercise: () => request<ExerciseLogResponse>('/api/chatbot/exercise/log', { method: 'POST' }),
  createReminder: (body: CreateReminderBody) =>
    request<ReminderDto>('/api/chatbot/reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateReminder: (id: string, body: UpdateReminderBody) =>
    request<ReminderDto>(`/api/chatbot/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteReminder: (id: string) => request<void>(`/api/chatbot/reminders/${id}`, { method: 'DELETE' }),
  deleteCalendarEvent: (id: string) => request<void>(`/api/chatbot/calendar/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateExpense: (id: string, body: UpdateExpenseBody) =>
    request<ExpenseDto>(`/api/chatbot/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
