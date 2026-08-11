import { createJsonRequester } from '@mmps/web-api';
import type {
  CreateEventBody,
  CreateReminderBody,
  DashboardResponse,
  EventDto,
  FullEmailDto,
  ReminderDto,
  UnreadEmailsResponse,
  UpcomingBirthdaysResponse,
  UpdateReminderBody,
  UsageResponse,
} from '../types';
import { getInitData } from './telegram';

const request = createJsonRequester({
  headers: () => ({
    'X-Telegram-Init-Data': getInitData(),
  }),
});

export const api = {
  dashboard: (date?: string) => request<DashboardResponse>(`/api/chatbot/dashboard${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  createReminder: (body: CreateReminderBody) => request<ReminderDto>('/api/chatbot/reminders', { method: 'POST', body: JSON.stringify(body) }),
  updateReminder: (id: string, body: UpdateReminderBody) => request<ReminderDto>(`/api/chatbot/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteReminder: (id: string) => request<void>(`/api/chatbot/reminders/${id}`, { method: 'DELETE' }),
  createCalendarEvent: (body: CreateEventBody) => request<EventDto>('/api/chatbot/calendar/events', { method: 'POST', body: JSON.stringify(body) }),
  deleteCalendarEvent: (id: string) => request<void>(`/api/chatbot/calendar/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  usage: (days: 7 | 30) => request<UsageResponse>(`/api/chatbot/usage?days=${days}`),
  unreadEmails: () => request<UnreadEmailsResponse>('/api/chatbot/emails/unread'),
  email: (id: string) => request<FullEmailDto>(`/api/chatbot/emails/${encodeURIComponent(id)}`),
  markEmailRead: (id: string) => request<void>(`/api/chatbot/emails/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  deleteEmail: (id: string) => request<void>(`/api/chatbot/emails/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  upcomingBirthdays: () => request<UpcomingBirthdaysResponse>('/api/chatbot/birthdays/upcoming'),
};
