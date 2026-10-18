import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { LessonPicker } from '../components/practice/LessonPicker';
import { useProgress } from '../hooks/useProgress';
import { ApiError } from '../lib/api';
import type { PracticeScope, PracticeScopeInfo } from '../lib/practice';
import { loadLastScope, parseLessonsParam, practiceErrorMessage, saveLastScope } from '../lib/practice';
import { practiceApi } from '../lib/practice-api';
import type { GuideId } from '../lib/types';

type Mode = 'all' | 'guides' | 'lessons';

const MODES: ReadonlyArray<{ readonly id: Mode; readonly label: string; readonly icon: 'sparkle' | 'map' | 'book' }> = [
  { id: 'all', label: 'Surprise me', icon: 'sparkle' },
  { id: 'guides', label: 'By course', icon: 'map' },
  { id: 'lessons', label: 'Pick lessons', icon: 'book' },
];

export function PracticeSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { progress, remote } = useProgress();

  const [info, setInfo] = useState<PracticeScopeInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('all');
  const [readOnly, setReadOnly] = useState(false);
  const [guides, setGuides] = useState<Set<GuideId>>(new Set());
  const [lessons, setLessons] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const readIds = useMemo(() => new Set(Object.values(progress.states).filter((s) => s.readAt).map((s) => s.biteId)), [progress]);

  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    const loadScope = async () => {
      try {
        const res = await practiceApi.scope();
        if (cancelled) return;
        setInfo(res);
        const known = new Set(res.lessons.filter((l) => l.questionCount > 0).map((l) => l.id));
        const fromQuery = parseLessonsParam(searchParams.get('lessons'), known);
        if (fromQuery.length > 0) {
          setMode('lessons');
          setLessons(new Set(fromQuery));
          return;
        }
        const last = loadLastScope();
        if (!last) return;
        setMode(last.kind);
        if (last.kind !== 'lessons') setReadOnly(Boolean(last.readOnly));
        if (last.kind === 'guides') setGuides(new Set(last.guides.filter((g) => res.guides.some((rg) => rg.id === g))));
        if (last.kind === 'lessons') setLessons(new Set(last.biteIds.filter((id) => known.has(id))));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.code : 'network_error');
      }
    };
    loadScope();
    return () => {
      cancelled = true;
    };
    // Prefill only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote]);

  const scope: PracticeScope | null = useMemo(() => {
    if (mode === 'all') return { kind: 'all', readOnly: readOnly || undefined };
    if (mode === 'guides') return guides.size > 0 ? { kind: 'guides', guides: [...guides], readOnly: readOnly || undefined } : null;
    return lessons.size > 0 ? { kind: 'lessons', biteIds: [...lessons] } : null;
  }, [mode, readOnly, guides, lessons]);

  const poolSize = useMemo(() => {
    if (!info) return 0;
    const pool = info.lessons.filter((l) => {
      if (mode === 'lessons') return lessons.has(l.id);
      if (mode === 'guides' && !guides.has(l.guide)) return false;
      if (readOnly && !readIds.has(l.id)) return false;
      return true;
    });
    return pool.reduce((sum, l) => sum + l.questionCount, 0);
  }, [info, mode, lessons, guides, readOnly, readIds]);

  const start = async () => {
    if (!scope || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const { attempt } = await practiceApi.start(scope);
      saveLastScope(scope);
      navigate(`/practice/${attempt.id}`);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.code : 'network_error');
      setStarting(false);
    }
  };

  const toggleGuide = (id: GuideId) => {
    setGuides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="practice-setup">
      <div className="reader-top practice-top">
        <Link className="back-link" to="/">
          ← Back to Today
        </Link>
        {remote && (
          <Link className="practice-history-link" to="/practice/history">
            <AppIcon name="history" size={17} /> History
          </Link>
        )}
      </div>

      <header className="page-head practice-hero">
        <span className="practice-hero-icon" aria-hidden="true">
          <AppIcon name="chat" size={26} />
        </span>
        <h1>Practice</h1>
        <p className="lead">Answer open questions in your own words. An AI tutor grades you against the expert answer, then you can dig deeper together.</p>
      </header>

      {!remote ? (
        <div className="empty practice-locked">
          <div className="big">
            <AppIcon name="chat" />
          </div>
          <p>{practiceErrorMessage('no_identity')}</p>
          <Link className="btn" to="/">
            Back to Today
          </Link>
        </div>
      ) : loadError ? (
        <div className="empty">
          <div className="big">
            <AppIcon name="unknown" />
          </div>
          <p>{practiceErrorMessage(loadError)}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            <AppIcon name="refresh" size={17} /> Try again
          </button>
        </div>
      ) : !info ? (
        <div className="practice-skeleton" aria-busy="true" aria-label="Loading practice">
          <div className="skeleton-row" />
          <div className="skeleton-row tall" />
        </div>
      ) : (
        <div className="stagger">
          <div className="practice-stats">
            <div className="practice-stat">
              <b>{info.totals.questions}</b>
              <span>questions</span>
            </div>
            <div className="practice-stat">
              <b>{info.totals.attempted}</b>
              <span>practiced</span>
            </div>
            <div className="practice-stat good">
              <b>{info.totals.mastered}</b>
              <span>mastered</span>
            </div>
            <div className="practice-stat due">
              <b>{info.totals.due}</b>
              <span>to revisit</span>
            </div>
          </div>

          <div className="segmented" role="tablist" aria-label="What to practice">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? 'active' : ''}
                onClick={() => {
                  setMode(m.id);
                  setStartError(null);
                }}
              >
                <AppIcon name={m.icon} size={17} />
                {m.label}
              </button>
            ))}
          </div>

          <div className="practice-panel" role="tabpanel">
            {mode === 'all' && (
              <p className="practice-panel-copy">
                A question from any lesson across all courses. Questions you struggled with come back more often, and new ones mix in so you keep growing.
              </p>
            )}

            {mode === 'guides' && (
              <div className="guide-options">
                {info.guides.map((g) => {
                  const on = guides.has(g.id);
                  return (
                    <button key={g.id} type="button" className={`guide-option ${g.id === 'system-design' ? 'course-sd' : 'course-ai'}${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleGuide(g.id)}>
                      <span className="guide-option-icon">
                        <AppIcon name={g.id} size={22} />
                      </span>
                      <span className="guide-option-text">
                        <b>{g.label}</b>
                        <span>{g.questionCount} questions</span>
                      </span>
                      <span className="picker-check" aria-hidden="true">
                        {on && <AppIcon name="check" size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {mode === 'lessons' && <LessonPicker info={info} selected={lessons} readIds={readIds} onChange={setLessons} />}

            {mode !== 'lessons' && (
              <label className="switch-row">
                <span>
                  <b>Only lessons I've read</b>
                  <span>{readIds.size === 0 ? "You haven't read any lessons yet" : `${readIds.size} lessons read`}</span>
                </span>
                <input type="checkbox" role="switch" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
                <span className="switch" aria-hidden="true" />
              </label>
            )}
          </div>

          {startError && (
            <p className="practice-error" role="alert">
              {practiceErrorMessage(startError)}
            </p>
          )}

          <div className="practice-start">
            <button type="button" className="btn primary block" disabled={!scope || starting || poolSize === 0} onClick={start}>
              {starting ? <span className="spinner" aria-hidden="true" /> : <AppIcon name="chat" size={18} />}
              {starting ? 'Picking a question…' : 'Start practicing'}
            </button>
            <span className="practice-start-note">
              {!scope ? (mode === 'guides' ? 'Choose at least one course' : 'Choose at least one lesson') : poolSize === 0 ? 'No questions in this selection yet' : `${poolSize} questions in this selection`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
