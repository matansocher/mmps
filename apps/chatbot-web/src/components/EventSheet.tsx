import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDateTimeLocal } from '../lib/date';

type Props = {
  readonly defaultDate: Date;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void | Promise<void>;
  readonly onError: () => void;
};

const HOUR_MS = 60 * 60 * 1000;

export function EventSheet({ defaultDate, onClose, onSaved, onError }: Props) {
  const [summary, setSummary] = useState('');
  const [startLocal, setStartLocal] = useState(() => {
    const base = new Date(defaultDate);
    base.setHours(18, 0, 0, 0);
    return formatDateTimeLocal(base);
  });
  const [endLocal, setEndLocal] = useState(() => {
    const base = new Date(defaultDate);
    base.setHours(19, 0, 0, 0);
    return formatDateTimeLocal(base);
  });
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleStartChange(value: string) {
    const prevStart = new Date(startLocal).getTime();
    const prevEnd = new Date(endLocal).getTime();
    setStartLocal(value);
    const nextStart = new Date(value).getTime();
    if (!Number.isNaN(nextStart)) {
      const duration = !Number.isNaN(prevStart) && !Number.isNaN(prevEnd) && prevEnd > prevStart ? prevEnd - prevStart : HOUR_MS;
      setEndLocal(formatDateTimeLocal(new Date(nextStart + duration)));
    }
  }

  const validRange = Boolean(startLocal && endLocal) && new Date(endLocal).getTime() > new Date(startLocal).getTime();

  async function handleSave() {
    if (!summary.trim() || !validRange) return;
    try {
      setBusy(true);
      await api.createCalendarEvent({
        summary: summary.trim(),
        start: new Date(startLocal).toISOString(),
        end: new Date(endLocal).toISOString(),
        location: location.trim() || undefined,
      });
      await onSaved('Event created');
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-bg-card border-t border-border-subtle rounded-t-3xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">New event</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Title</span>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What's the event?"
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Starts</span>
          <input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => handleStartChange(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Ends</span>
          <input
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Location (optional)</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where?"
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
        </label>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={busy || !summary.trim() || !validRange}
            className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-medium disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
