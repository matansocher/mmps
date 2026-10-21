import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { DifficultyBadge } from '../components/practice/DifficultyBadge';
import { useProgress } from '../hooks/useProgress';
import { ApiError } from '../lib/api';
import type { PracticeAttemptSummary, PracticeVerdict } from '../lib/practice';
import { practiceErrorMessage, scoreColorVar, verdictLabel, verdictTone } from '../lib/practice';
import { practiceApi } from '../lib/practice-api';

const PAGE_SIZE = 20;

const FILTERS: ReadonlyArray<{ readonly id: PracticeVerdict | null; readonly label: string }> = [
  { id: null, label: 'All' },
  { id: 'incorrect', label: 'Not quite' },
  { id: 'partial', label: 'Partial' },
  { id: 'correct', label: 'Correct' },
];

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function PracticeHistoryPage() {
  const { remote } = useProgress();
  const [verdict, setVerdict] = useState<PracticeVerdict | null>(null);
  const [items, setItems] = useState<PracticeAttemptSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await practiceApi.list({ before, limit: PAGE_SIZE, verdict: verdict ?? undefined });
        setItems((prev) => (before ? [...prev, ...res.attempts] : res.attempts));
        setHasMore(res.hasMore);
      } catch (err) {
        setError(err instanceof ApiError ? err.code : 'network_error');
      } finally {
        setLoading(false);
      }
    },
    [verdict],
  );

  useEffect(() => {
    if (!remote) return;
    setItems([]);
    load();
  }, [remote, load]);

  return (
    <div className="practice-history">
      <div className="reader-top">
        <Link className="back-link" to="/practice">
          ← Practice
        </Link>
      </div>
      <header className="page-head">
        <h1>Practice history</h1>
        <p className="lead">Revisit your answers, the feedback, and the conversations you had with the tutor.</p>
      </header>

      {!remote ? (
        <div className="empty">
          <p>{practiceErrorMessage('no_identity')}</p>
        </div>
      ) : (
        <>
          <div className="history-filters" role="group" aria-label="Filter by result">
            {FILTERS.map((f) => (
              <button key={f.label} type="button" className={`chip${verdict === f.id ? ' active' : ''}`} aria-pressed={verdict === f.id} onClick={() => setVerdict(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="practice-error" role="alert">
              <span>{practiceErrorMessage(error)}</span>
              <button type="button" className="composer-link" onClick={() => load(items.at(-1)?.createdAt)}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="empty">
              <div className="big">
                <AppIcon name="history" />
              </div>
              <p>{verdict ? 'No answers with this result yet.' : 'No practice yet. Your graded answers will show up here.'}</p>
              <Link className="btn primary" to="/practice">
                Start practicing
              </Link>
            </div>
          )}

          <ul className="history-list">
            {items.map((item) => {
              const tone = verdictTone(item);
              return (
                <li key={item.id}>
                  <Link className={`history-item tone-${tone}`} to={`/practice/${item.id}`}>
                    <span className="history-score" style={{ ['--score-color' as string]: item.skipped ? 'var(--text-faint)' : scoreColorVar(item.score) }}>
                      {item.skipped ? '–' : item.score}
                    </span>
                    <span className="history-body">
                      <span className="history-question">{item.questionText}</span>
                      <span className="history-meta">
                        <span className={`verdict-chip small ${tone}`}>{verdictLabel(item)}</span>
                        <DifficultyBadge difficulty={item.difficulty} />
                        <span>{item.lessonTitle}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>
                      </span>
                    </span>
                    <span className="home-action-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {loading && <div className="practice-skeleton" aria-busy="true" aria-label="Loading history"><div className="skeleton-row" /></div>}

          {hasMore && !loading && (
            <button type="button" className="btn block" onClick={() => load(items.at(-1)?.createdAt)}>
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
