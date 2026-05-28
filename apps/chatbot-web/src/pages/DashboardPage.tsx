import { useCallback, useEffect, useState } from 'react';
import { DayPicker } from '../components/DayPicker';
import { EventRow } from '../components/EventRow';
import { ExpenseRow } from '../components/ExpenseRow';
import { HeatmapStrip } from '../components/HeatmapStrip';
import { ReminderRow } from '../components/ReminderRow';
import { ReminderSheet } from '../components/ReminderSheet';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import { WeatherCard } from '../components/WeatherCard';
import { api } from '../lib/api';
import { dateFromYmd, formatLongDate, todayYmd } from '../lib/date';
import { haptic } from '../lib/telegram';
import type { DashboardResponse, ExpenseTotal, ReminderDto } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<ReminderDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [logging, setLogging] = useState(false);

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

  async function handleLog() {
    if (!data || data.activity.todayDone || !data.isToday) return;
    try {
      setLogging(true);
      const result = await api.logExercise();
      if (result.logged) {
        haptic('success');
        setToast({ message: '🔥 Logged!', kind: 'success' });
      } else if (result.alreadyDoneToday) {
        setToast({ message: 'Already logged today', kind: 'info' });
      }
      await load();
    } catch {
      haptic('error');
      setToast({ message: 'Failed to log', kind: 'error' });
    } finally {
      setLogging(false);
    }
  }

  async function toggleReminder(reminder: ReminderDto) {
    if (reminder.status === 'completed') return;
    try {
      await api.updateReminder(reminder.id, { status: 'completed' });
      haptic('success');
      setData((prev) =>
        prev
          ? {
              ...prev,
              reminders: prev.reminders.map((r) => (r.id === reminder.id ? { ...r, status: 'completed' } : r)),
            }
          : prev,
      );
    } catch {
      setToast({ message: 'Failed to complete', kind: 'error' });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4 pb-24">
      <header className="flex flex-col gap-3">
        <DayPicker selected={selectedDate} onSelect={setSelectedDate} />
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wide">{data?.isToday ? 'Today' : 'Day'}</div>
          <h1 className="text-xl font-semibold">{formatLongDate(selectedDate)}</h1>
        </div>
      </header>

      {loading && !data ? (
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
              <Empty>Nothing scheduled</Empty>
            ) : (
              data.events.map((event) => <EventRow key={event.id} event={event} />)
            )}
          </Section>

          <Section
            title={`Reminders · ${data.reminders.length}`}
            action={
              <button
                onClick={() => setCreating(true)}
                className="text-xs text-accent-primary hover:underline"
              >
                + Add
              </button>
            }
          >
            {data.reminders.length === 0 ? (
              <Empty>No reminders for this day</Empty>
            ) : (
              data.reminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  onToggleComplete={() => toggleReminder(reminder)}
                  onTap={(r) => setEditing(r)}
                />
              ))
            )}
          </Section>

          <Section
            title={`Expenses · ${data.expenses.length}`}
            action={data.expenseTotals.length > 0 ? <ExpenseTotalsBadge totals={data.expenseTotals} /> : null}
          >
            {data.expenses.length === 0 ? (
              <Empty>No expenses for this day</Empty>
            ) : (
              data.expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)
            )}
          </Section>

          <HeatmapStrip days={data.activity.heatmap} />

          <button
            onClick={handleLog}
            disabled={!data.isToday || data.activity.todayDone || logging}
            className={`w-full rounded-2xl py-5 text-base font-semibold transition-colors ${
              data.activity.todayDone
                ? 'bg-accent-success/15 text-accent-success border border-accent-success/30 cursor-default'
                : !data.isToday
                  ? 'bg-bg-elevated text-text-muted border border-border-subtle cursor-not-allowed'
                  : 'bg-accent-success text-bg-base hover:bg-accent-success/90 active:scale-[0.99]'
            } ${logging ? 'opacity-70' : ''}`}
          >
            {data.activity.todayDone
              ? '✅ Logged for today'
              : !data.isToday
                ? 'Go to today to log a workout'
                : logging
                  ? '…'
                  : '💪 I exercised today'}
          </button>
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

function ExpenseTotalsBadge({ totals }: { readonly totals: ReadonlyArray<ExpenseTotal> }) {
  const symbol: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' };
  return (
    <span className="text-xs tabular text-text-secondary">
      {totals.map((t) => `${symbol[t.currency] || t.currency}${t.total.toFixed(2)}`).join(' · ')}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <WeatherCardSkeleton />
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={2} />
      <HeatmapSkeleton />
      <Skeleton className="w-full h-[68px] rounded-2xl" />
    </>
  );
}

function WeatherCardSkeleton() {
  return (
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
      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
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

function HeatmapSkeleton() {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: 'minmax(0, 1fr)' }}>
        {Array.from({ length: 13 * 7 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" rounded="sm" />
        ))}
      </div>
    </div>
  );
}

