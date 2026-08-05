import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import type { EmailDto } from '../types';
import { EmailSheet } from './EmailSheet';
import { Skeleton } from './Skeleton';

function displayFrom(from: string): string {
  const match = from.match(/^(.*?)\s*<[^>]+>$/);
  return match ? match[1].trim() || from : from;
}

type Props = {
  readonly onToast: (message: string, kind: 'success' | 'error' | 'info') => void;
};

export function EmailSection({ onToast }: Props) {
  const [emails, setEmails] = useState<EmailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.unreadEmails();
      setEmails(r.emails);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleDone(message: string) {
    haptic('success');
    setOpenId(null);
    onToast(message, 'success');
    load();
  }

  function handleError(message: string) {
    haptic('error');
    onToast(message, 'error');
  }

  async function handleMarkRead(email: EmailDto) {
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    try {
      await api.markEmailRead(email.id);
      haptic('success');
      onToast('Marked as read', 'success');
    } catch {
      handleError('Failed to mark as read');
      load();
    }
  }

  async function handleDelete(email: EmailDto) {
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    try {
      await api.deleteEmail(email.id);
      haptic('success');
      onToast('Email deleted', 'success');
    } catch {
      handleError('Failed to delete');
      load();
    }
  }

  return (
    <>
      <section className="rounded-2xl bg-bg-card border border-border-subtle">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
          <span>Inbox · {loading ? '…' : `${emails.length} unread`}</span>
        </div>
        <div className="px-4 divide-y divide-border-subtle">
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </>
          ) : error ? (
            <p className="py-4 text-sm text-text-muted">Failed to load emails</p>
          ) : emails.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">No unread emails</div>
          ) : (
            emails.map((email) => (
              <div key={email.id} className="flex items-center gap-2 py-2.5 animate-fade-in">
                <button onClick={() => setOpenId(email.id)} className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                  <span className="text-sm font-medium text-text-primary truncate">{displayFrom(email.from)}</span>
                  <span className="text-sm text-text-secondary truncate">{email.subject}</span>
                  <span className="text-xs text-text-muted truncate">{email.snippet}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(email);
                    }}
                    aria-label="Mark as read"
                    title="Mark as read"
                    className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-text-muted hover:text-accent-success hover:bg-bg-elevated transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(email);
                    }}
                    aria-label="Delete email"
                    title="Delete"
                    className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-text-muted hover:text-accent-danger hover:bg-bg-elevated transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {openId && (
        <EmailSheet
          emailId={openId}
          onClose={() => setOpenId(null)}
          onDone={handleDone}
          onError={handleError}
        />
      )}
    </>
  );
}
