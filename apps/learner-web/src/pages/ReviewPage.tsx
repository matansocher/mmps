import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { BiteCard } from '../components/BiteCard';
import { useProgress } from '../hooks/useProgress';
import { getBite } from '../lib/bites';
import { biteStatus } from '../lib/scheduler';
import { selectReviewQueue } from '../lib/selection';

export function ReviewPage() {
  const { progress } = useProgress();
  const now = useMemo(() => new Date(), []);
  const reviewIds = useMemo(() => selectReviewQueue(progress, now), [progress, now]);

  return (
    <div>
      <div className="page-head">
        <h1>
          <AppIcon name="review" /> Review
        </h1>
        <p className="lead">Sections resurfacing for spaced repetition — the best time to lock them in.</p>
      </div>

      {reviewIds.length === 0 ? (
        <div className="empty">
          <div className="big">
            <AppIcon name="check" />
          </div>
          <p>Nothing due right now. Rated sections come back on a spaced schedule.</p>
          <Link className="btn" to="/">
            Back to today
          </Link>
        </div>
      ) : (
        reviewIds.map((id) => {
          const bite = getBite(id);
          if (!bite) return null;
          return <BiteCard key={id} bite={bite} status={biteStatus(progress.states[id], now)} from="/review" />;
        })
      )}
    </div>
  );
}
