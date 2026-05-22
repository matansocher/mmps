import { parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDateTimeLocal } from '../lib/date';
import type { ReminderDto } from '../types';

type Props = {
  readonly reminder: ReminderDto | null;
  readonly defaultDate: Date;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void | Promise<void>;
  readonly onError: () => void;
};

const SNOOZE_OPTIONS: ReadonlyArray<{ label: string; minutes: number }> = [
  { label: '15 min', minutes: 15 },
  { label: '1 hr', minutes: 60 },
  { label: '3 hr', minutes: 180 },
  { label: 'Tomorrow', minutes: 60 * 24 },
];

export function ReminderSheet({ reminder, defaultDate, onClose, onSaved, onError }: Props) {
  const isEdit = Boolean(reminder);

  const [message, setMessage] = useState(reminder?.message ?? '');
  const [dueLocal, setDueLocal] = useState(() => {
    if (reminder) return formatDateTimeLocal(parseISO(reminder.dueDate));
    const base = new Date(defaultDate);
    base.setHours(18, 0, 0, 0);
    return formatDateTimeLocal(base);
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!message.trim() || !dueLocal) return;
    try {
      setBusy(true);
      const iso = new Date(dueLocal).toISOString();
      if (reminder) {
        await api.updateReminder(reminder.id, { message: message.trim(), dueDate: iso });
        await onSaved('Reminder updated');
      } else {
        await api.createReminder({ message: message.trim(), dueDate: iso });
        await onSaved('Reminder created');
      }
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!reminder) return;
    try {
      setBusy(true);
      await api.updateReminder(reminder.id, { status: 'completed' });
      await onSaved('Reminder completed');
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  async function handleSnooze(minutes: number) {
    if (!reminder) return;
    try {
      setBusy(true);
      await api.updateReminder(reminder.id, { snoozeMinutes: minutes });
      await onSaved(`Snoozed for ${minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${minutes / 60}h` : '1 day'}`);
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!reminder) return;
    try {
      setBusy(true);
      await api.deleteReminder(reminder.id);
      await onSaved('Reminder deleted');
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
          <h2 className="text-base font-semibold">{isEdit ? 'Edit reminder' : 'New reminder'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">Message</span>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should I remind you about?"
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-muted">When</span>
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </label>

        {isEdit && (
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted mb-2">Snooze</div>
            <div className="flex flex-wrap gap-2">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => handleSnooze(opt.minutes)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-full bg-bg-elevated border border-border-subtle text-sm text-text-secondary hover:text-text-primary"
                >
                  ⏸️ {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {isEdit && (
            <>
              <button
                onClick={handleComplete}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-accent-success/15 border border-accent-success/30 text-accent-success font-medium"
              >
                ✅ Complete
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="py-3 px-4 rounded-xl bg-accent-danger/15 border border-accent-danger/30 text-accent-danger"
                aria-label="Delete"
              >
                🗑️
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={busy || !message.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-medium disabled:opacity-50"
          >
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
