import { useCallback, useEffect, useState } from 'react';
import { HeatmapStrip } from '../components/HeatmapStrip';
import { Skeleton } from '../components/Skeleton';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import type { ActivitySummary } from '../types';

type ToastState = { readonly message: string; readonly kind: 'success' | 'error' | 'info' } | null;

export function ExercisePage() {
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.exercise();
      setActivity(r.activity);
    } catch {
      setToast({ message: 'Failed to load', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLog() {
    if (!activity || activity.todayDone) return;
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
      <header>
        <div className="text-xs text-text-muted uppercase tracking-wide">Exercise</div>
        <h1 className="text-xl font-semibold">Stay in motion</h1>
      </header>

      {loading && !activity ? (
        <>
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
          <Skeleton className="h-[68px] w-full rounded-2xl" />
        </>
      ) : activity ? (
        <>
          <HeatmapStrip days={activity.heatmap} />

          <button
            onClick={handleLog}
            disabled={activity.todayDone || logging}
            className={`w-full rounded-2xl py-5 text-base font-semibold transition-colors ${
              activity.todayDone
                ? 'bg-accent-success/15 text-accent-success border border-accent-success/30 cursor-default'
                : 'bg-accent-success text-bg-base hover:bg-accent-success/90 active:scale-[0.99]'
            } ${logging ? 'opacity-70' : ''}`}
          >
            {activity.todayDone ? '✅ Logged for today' : logging ? '…' : '💪 I exercised today'}
          </button>
        </>
      ) : null}

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}
