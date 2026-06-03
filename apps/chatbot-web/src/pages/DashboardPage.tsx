import { useCallback, useEffect, useState } from 'react';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { DayPicker } from '../components/DayPicker';
import { EventRow } from '../components/EventRow';
import { ReminderRow } from '../components/ReminderRow';
import { ReminderSheet } from '../components/ReminderSheet';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import { WeatherCard } from '../components/WeatherCard';
import { api } from '../lib/api';
import { dateFromYmd, formatLongDate, todayYmd } from '../lib/date';
import { haptic } from '../lib/telegram';
import type { DashboardResponse, EventDto, ReminderDto } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ReminderDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventDto | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.dashboard(selectedDate);
      setData(d);
    } catch {
      setToast({ message: 'Failed to load', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleReminder(reminder: ReminderDto) {
    const nextStatus: 'completed' | 'pending' = reminder.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateReminder(reminder.id, { status: nextStatus });
      haptic(nextStatus === 'completed' ? 'success' : 'select');
      setData((prev) =>
        prev
          ? { ...prev, reminders: prev.reminders.map((r) => (r.id === reminder.id ? updated : r)) }
          : prev,
      );
    } catch {
      setToast({ message: nextStatus === 'completed' ? 'Failed to complete' : 'Failed to update', kind: 'error' });
    }
  }

  async function confirmDeleteEvent() {
    if (!deletingEvent) return;
    const ev = deletingEvent;
    setDeletingEvent(null);
    setData((prev) => (prev ? { ...prev, events: prev.events.filter((e) => e.id !== ev.id) } : prev));
    try {
      await api.deleteCalendarEvent(ev.id);
      haptic('success');
      setToast({ message: 'Event deleted', kind: 'success' });
    } catch {
      haptic('error');
      setToast({ message: 'Failed to delete', kind: 'error' });
      await load();
    }
  }

  const sortedReminders = data
    ? [...data.reminders].sort((a, b) => {
        const aDone = a.status === 'completed' ? 1 : 0;
        const bDone = b.status === 'completed' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.dueDate.localeCompare(b.dueDate);
      })
    : [];
  const pendingCount = sortedReminders.filter((r) => r.status !== 'completed').length;
  const overdueCount = sortedReminders.filter((r) => r.status !== 'completed' && r.dueDate.slice(0, 10) < selectedDate).length;
  const remindersTitle = overdueCount > 0
    ? `Reminders · ${pendingCount} (${overdueCount} overdue)`
    : `Reminders · ${pendingCount}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <DayPicker selected={selectedDate} onSelect={setSelectedDate} />
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wide">{data?.isToday ? 'Today' : 'Day'}</div>
          <h1 className="text-xl font-semibold">{formatLongDate(selectedDate)}</h1>
        </div>
      </header>

      {loading ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {data.weather && <WeatherCard weather={data.weather} />}

          {data.birthdays.length > 0 && (
            <Section title={`Birthdays · ${data.birthdays.length}`}>
              {data.birthdays.map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-2.5">
                  <div className="text-2xl shrink-0">🎂</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{event.summary}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          <Section title={`Events · ${data.events.length}`}>
            {data.events.length === 0 ? (
              <Empty>Quiet day, no events</Empty>
            ) : (
              data.events.map((event) => (
                <EventRow key={event.id} event={event} onDelete={setDeletingEvent} />
              ))
            )}
          </Section>

          <Section
            title={remindersTitle}
            action={
              <button onClick={() => setCreating(true)} className="text-xs text-accent-primary hover:underline">
                + Add
              </button>
            }
          >
            {sortedReminders.length === 0 ? (
              <Empty>Nothing on your plate 🎉</Empty>
            ) : (
              sortedReminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  selectedDate={selectedDate}
                  onToggleComplete={() => toggleReminder(reminder)}
                  onTap={(r) => setEditing(r)}
                />
              ))
            )}
          </Section>
        </>
      ) : null}

      {(creating || editing) && (
        <ReminderSheet
          reminder={editing}
          defaultDate={dateFromYmd(selectedDate)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async (message) => {
            setCreating(false);
            setEditing(null);
            setToast({ message, kind: 'success' });
            await load();
          }}
          onError={() => setToast({ message: 'Failed to save', kind: 'error' })}
        />
      )}

      {deletingEvent && (
        <ConfirmSheet
          title="Delete event?"
          body={deletingEvent.summary}
          confirmLabel="Delete"
          destructive
          onConfirm={confirmDeleteEvent}
          onCancel={() => setDeletingEvent(null)}
        />
      )}

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Section({ title, action, children }: { readonly title: string; readonly action?: React.ReactNode; readonly children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
        <span>{title}</span>
        {action}
      </div>
      <div className="px-4 divide-y divide-border-subtle">{children}</div>
    </section>
  );
}

function Empty({ children }: { readonly children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-text-muted">{children}</div>;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10" rounded="full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={2} />
    </>
  );
}

function SectionSkeleton({ rows }: { readonly rows: number }) {
  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle">
      <div className="px-4 py-3 border-b border-border-subtle">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="px-4 divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-4 w-12 shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
