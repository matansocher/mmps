import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { UpcomingBirthdayDto } from '../types';

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

function inDaysLabel(inDays: number): string {
  if (inDays === 0) return 'Today';
  if (inDays === 1) return 'Tomorrow';
  return `in ${inDays} days`;
}

export function UpcomingBirthdays() {
  const [birthdays, setBirthdays] = useState<ReadonlyArray<UpcomingBirthdayDto>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const r = await api.upcomingBirthdays();
        setBirthdays(r.birthdays);
      } catch {
        // load failure — card simply stays hidden
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  if (!loaded || birthdays.length === 0) return null;

  return (
    <section className="rounded-2xl bg-bg-card border border-border-subtle">
      <div className="px-4 py-3 border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
        Birthdays · next 7 days
      </div>
      <div className="px-4 divide-y divide-border-subtle">
        {birthdays.map((b) => (
          <div key={b.id} className="flex items-center gap-3 py-2.5">
            <div className="text-2xl shrink-0">🎂</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">{b.summary}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-text-muted">{inDaysLabel(b.inDays)}</div>
              <div className="text-xs text-text-muted">{formatShortDate(b.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
