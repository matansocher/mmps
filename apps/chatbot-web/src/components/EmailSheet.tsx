import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FullEmailDto } from '../types';
import { Skeleton } from './Skeleton';

type Props = {
  readonly emailId: string;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly onError: (message: string) => void;
};

export function EmailSheet({ emailId, onClose, onDone, onError }: Props) {
  const [email, setEmail] = useState<FullEmailDto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.email(emailId).then(setEmail).catch(() => setLoadError(true));
  }, [emailId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleMarkRead() {
    try {
      setBusy(true);
      await api.markEmailRead(emailId);
      onDone('Marked as read');
    } catch {
      onError('Failed to mark as read');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    try {
      setBusy(true);
      await api.deleteEmail(emailId);
      onDone('Email deleted');
    } catch {
      onError('Failed to delete email');
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
          <h2 className="text-base font-semibold">Email</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        {loadError ? (
          <p className="text-sm text-text-muted py-4 text-center">Failed to load email</p>
        ) : !email ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-text-primary leading-snug">{email.subject}</div>
              <div className="text-xs text-text-muted">{email.from} · {email.date}</div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-text-secondary border border-border-subtle rounded-xl px-3 py-2.5 bg-bg-elevated">
              {email.bodyText}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleMarkRead}
            disabled={busy || !email}
            className="flex-1 py-3 rounded-xl bg-accent-success/15 border border-accent-success/30 text-accent-success font-medium disabled:opacity-50"
          >
            ✅ Mark read
          </button>
          <button
            onClick={handleDelete}
            disabled={busy || !email}
            aria-label="Delete email"
            className="py-3 px-4 rounded-xl bg-accent-danger/15 border border-accent-danger/30 text-accent-danger disabled:opacity-50"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
