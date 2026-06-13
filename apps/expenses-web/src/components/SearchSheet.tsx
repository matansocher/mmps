import { useEffect, useRef, useState } from 'react';
import { ExpenseRow } from './ExpenseRow';
import { Skeleton } from './Skeleton';
import { api } from '../lib/api';
import { formatExpenseDayLabel } from '../lib/date';
import type { ExpenseDto } from '../types';

type Props = {
  readonly onClose: () => void;
  readonly onTap: (expense: ExpenseDto) => void;
};

export function SearchSheet({ onClose, onTap }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ReadonlyArray<ExpenseDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await api.searchExpenses(trimmed);
        setResults(r);
        setError(null);
      } catch {
        setError('Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl h-[88vh] flex flex-col animate-fade-in">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border-subtle">
          <span className="text-text-muted text-base" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vendor or notes…"
            className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-text-muted hover:text-text-primary text-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="py-8 text-center text-xs text-text-muted">Type at least 2 characters</div>
          ) : loading ? (
            <div className="px-4 py-3 space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-accent-danger">{error}</div>
          ) : results && results.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">No matches</div>
          ) : (
            <div className="px-4 divide-y divide-border-subtle">
              {results?.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onTap={onTap}
                  dayLabel={formatExpenseDayLabel(expense.transactionDate)}
                />
              ))}
              {results && results.length >= 50 && (
                <div className="py-3 text-center text-[11px] text-text-muted">Showing top 50 — refine to narrow</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
