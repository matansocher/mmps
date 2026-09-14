import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BiteCard } from '../components/BiteCard';
import { useProgress } from '../hooks/useProgress';
import { CURRICULUM, GUIDES, getBite } from '../lib/bites';
import { biteStatus, summarize } from '../lib/scheduler';
import { selectReviewQueue, selectTodayBites } from '../lib/selection';

export function TodayPage() {
  const { progress, remote } = useProgress();
  const now = useMemo(() => new Date(), []);

  const todayIds = useMemo(() => selectTodayBites(progress, now), [progress, now]);
  const reviewIds = useMemo(() => selectReviewQueue(progress, now), [progress, now]);
  const summary = useMemo(() => summarize(progress, CURRICULUM, now), [progress, now]);
  const pct = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;

  return (
    <div>
      {!remote ? <div className="banner local">Studying locally — open inside Telegram to sync your progress across devices.</div> : null}

      <div className="today-hero">
        <h1>Today&apos;s bites 🍰</h1>
        <p>{todayIds.length ? `${todayIds.length} bite${todayIds.length > 1 ? 's' : ''} picked for you. Small steps, every day.` : 'All caught up — nothing left for today.'}</p>
      </div>

      <div className="progress-wrap">
        <div className="ring" style={{ ['--p' as string]: pct }}>
          <span>{pct}%</span>
        </div>
        <div className="progress-stats">
          <span className="stat mastered">
            <b>{summary.mastered}</b>
            <span>Mastered</span>
          </span>
          <span className="stat learning">
            <b>{summary.learning}</b>
            <span>Learning</span>
          </span>
          <span className="stat due">
            <b>{summary.due}</b>
            <span>Due</span>
          </span>
          <span className="stat">
            <b>{summary.notStarted}</b>
            <span>New</span>
          </span>
        </div>
      </div>

      {todayIds.length === 0 ? (
        <div className="empty">
          <div className="big">🎉</div>
          <p>You&apos;ve finished today&apos;s bites. Come back later or browse the full library.</p>
          <Link className="btn" to="/browse">
            Browse all sections
          </Link>
        </div>
      ) : (
        todayIds.map((id) => {
          const bite = getBite(id);
          if (!bite) return null;
          return <BiteCard key={id} bite={bite} status={biteStatus(progress.states[id], now)} guideIcon={GUIDES[bite.guide].icon} />;
        })
      )}

      {reviewIds.length > 0 ? (
        <>
          <div className="section-label">Due for review · {reviewIds.length}</div>
          <Link className="btn block" to="/review">
            Start review session →
          </Link>
        </>
      ) : null}
    </div>
  );
}
