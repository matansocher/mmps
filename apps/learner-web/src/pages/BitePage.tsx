import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { RatingBar } from '../components/RatingBar';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { useProgress } from '../hooks/useProgress';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { GUIDES, getBite, nextBiteInGuide } from '../lib/bites';
import { hasQuiz } from '../lib/quizzes';

export function BitePage() {
  const { biteId = '' } = useParams();
  const navigate = useNavigate();
  const { progress, rateBite, markRead } = useProgress();
  const bite = useMemo(() => getBite(biteId), [biteId]);
  const readingPercent = useReadingProgress([biteId]);

  useEffect(() => {
    if (bite) markRead(bite.id);
    window.scrollTo(0, 0);
  }, [bite, markRead]);

  if (!bite) {
    return (
      <div className="empty">
        <div className="big">
          <AppIcon name="unknown" />
        </div>
        <p>That section could not be found.</p>
        <Link className="btn" to="/browse">
          Back to browse
        </Link>
      </div>
    );
  }

  const state = progress.states[bite.id];
  const guide = GUIDES[bite.guide];
  const nextBite = nextBiteInGuide(bite.id);

  return (
    <div>
      <div className="reader-top">
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <div className="bite-meta" style={{ marginBottom: 6 }}>
        <span className={`chip ${bite.guide === 'system-design' ? 'guide-sd' : 'guide-ai'}`}>
          <AppIcon name={bite.guide} size={15} /> {guide.label}
        </span>
        <span className="chip">{bite.minutes} min read</span>
      </div>
      <h1 className="reader-title">{bite.title}</h1>
      {bite.subtitle ? <p className="reader-sub">{bite.subtitle}</p> : null}

      <div className="bite-body" dangerouslySetInnerHTML={{ __html: bite.html }} />

      {hasQuiz(bite.id) ? (
        <div className="quiz-cta">
          <Link className="btn block" to={`/quiz/${encodeURIComponent(bite.id)}`}>
            <AppIcon name="brain" size={19} /> Test yourself on this section
          </Link>
        </div>
      ) : null}

      {!bite.isReference ? <RatingBar current={state?.rating ?? null} onRate={(rating) => rateBite(bite.id, rating)} /> : null}

      {nextBite ? (
        <div className="next-lesson">
          <Link className="btn block" to={`/bite/${encodeURIComponent(nextBite.id)}`}>
            Next lesson: {nextBite.title} →
          </Link>
        </div>
      ) : null}

      <ReadingProgressBar percent={readingPercent} />
    </div>
  );
}
