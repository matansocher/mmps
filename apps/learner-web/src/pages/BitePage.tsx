import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { useProgress } from '../hooks/useProgress';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { GUIDES, bitesByGuide, getBite } from '../lib/bites';
import { hasQuiz } from '../lib/quizzes';
import { hasScenario } from '../lib/scenarios';
import { summarize } from '../lib/scheduler';

export function BitePage() {
  const { biteId = '' } = useParams();
  const location = useLocation();
  const { progress, rateBite, markRead } = useProgress();
  const [showMastery, setShowMastery] = useState(false);
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
  const from = (location.state as { readonly from?: string } | null)?.from;
  const backDestination = from === '/browse' || from === '/review' || from === '/map' ? from : '/';
  const backLabel = backDestination === '/browse' ? 'Back to Browse' : backDestination === '/review' ? 'Back to Review' : backDestination === '/map' ? 'Back to Knowledge Map' : 'Back to Today';
  const courseBites = bitesByGuide(bite.guide);
  const courseSummary = summarize(
    progress,
    courseBites.map((courseBite) => courseBite.id),
  );
  const masteredAfterCompletion = courseSummary.mastered + (state?.rating === 'got_it' ? 0 : 1);

  return (
    <div>
      <div className="reader-top">
        <Link className="back-link" to={backDestination}>
          ← {backLabel}
        </Link>
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

      {hasScenario(bite.id) ? (
        <div className="scenario-cta">
          <div>
            <strong>Put this idea into practice</strong>
            <p>Make one realistic decision and explore its tradeoffs.</p>
          </div>
          <Link className="btn" to={`/scenario/${encodeURIComponent(bite.id)}`} state={{ from: backDestination }}>
            <AppIcon name="scenario" size={19} /> Try scenario mode
          </Link>
        </div>
      ) : null}

      {hasQuiz(bite.id) ? (
        <div className="quiz-cta">
          <p className="quiz-cta-copy">Ready to check your understanding?</p>
          <Link className="btn block" to={`/quiz/${encodeURIComponent(bite.id)}`} state={{ from: backDestination }}>
            <AppIcon name="brain" size={19} /> Take the section quiz
          </Link>
        </div>
      ) : null}

      {!bite.isReference ? (
        <div className="completion-cta">
          <button
            type="button"
            className="btn primary block"
            disabled={state?.rating === 'got_it'}
            onClick={() => {
              rateBite(bite.id, 'got_it');
              setShowMastery(true);
            }}
          >
            <AppIcon name="check" size={19} /> {state?.rating === 'got_it' ? 'Marked as learned' : 'I learned this material'}
          </button>
          {showMastery ? (
            <div className="mastery-moment" role="status">
              <span className="mastery-icon">
                <AppIcon name="complete" size={26} />
              </span>
              <div>
                <strong>{masteredAfterCompletion === courseSummary.total ? `${guide.label} complete!` : `${bite.title} is now learned.`}</strong>
                <p>
                  You&apos;ve mastered {masteredAfterCompletion} of {courseSummary.total} {guide.label} bites.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ScrollToTopButton />
      <ReadingProgressBar percent={readingPercent} />
    </div>
  );
}
