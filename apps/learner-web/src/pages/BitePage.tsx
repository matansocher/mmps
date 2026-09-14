import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RatingBar } from '../components/RatingBar';
import { useProgress } from '../hooks/useProgress';
import { GUIDES, getBite } from '../lib/bites';
import { hasQuiz } from '../lib/quizzes';

export function BitePage() {
  const { biteId = '' } = useParams();
  const navigate = useNavigate();
  const { progress, rateBite, markRead } = useProgress();
  const bite = useMemo(() => getBite(biteId), [biteId]);

  useEffect(() => {
    if (bite) markRead(bite.id);
    window.scrollTo(0, 0);
  }, [bite, markRead]);

  if (!bite) {
    return (
      <div className="empty">
        <div className="big">🤷</div>
        <p>That section could not be found.</p>
        <Link className="btn" to="/browse">
          Back to browse
        </Link>
      </div>
    );
  }

  const state = progress.states[bite.id];
  const guide = GUIDES[bite.guide];

  return (
    <div>
      <div className="reader-top">
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <div className="bite-meta" style={{ marginBottom: 6 }}>
        <span className={`chip ${bite.guide === 'system-design' ? 'guide-sd' : 'guide-ai'}`}>
          {guide.icon} {guide.label}
        </span>
        <span className="chip">{bite.minutes} min read</span>
      </div>
      <h1 className="reader-title">{bite.title}</h1>
      {bite.subtitle ? <p className="reader-sub">{bite.subtitle}</p> : null}

      <div className="bite-body" dangerouslySetInnerHTML={{ __html: bite.html }} />

      {hasQuiz(bite.id) ? (
        <div className="quiz-cta">
          <Link className="btn block" to={`/quiz/${encodeURIComponent(bite.id)}`}>
            🧠 Test yourself on this section
          </Link>
        </div>
      ) : null}

      {!bite.isReference ? <RatingBar current={state?.rating ?? null} onRate={(rating) => rateBite(bite.id, rating)} /> : null}
    </div>
  );
}
