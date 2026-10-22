import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { SectionQuiz } from '../components/SectionQuiz';
import { useProgress } from '../hooks/useProgress';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { GUIDES, bitesByGuide, getBite } from '../lib/bites';
import { celebrateLesson } from '../lib/celebrate';
import { hasQuiz } from '../lib/quizzes';
import { hasScenario } from '../lib/scenarios';
import { summarize } from '../lib/scheduler';

export function BitePage() {
  const { biteId = '' } = useParams();
  const location = useLocation();
  const { progress, rateBite, markRead, remote } = useProgress();
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
      <div className="reader-meta">
        <span className={`chip ${bite.guide === 'system-design' ? 'guide-sd' : 'guide-ai'}`}>
          <AppIcon name={bite.guide} size={15} /> {guide.label}
        </span>
        {bite.section ? <span className="chip">{bite.section}</span> : null}
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

      {hasQuiz(bite.id) ? <SectionQuiz key={bite.id} biteId={bite.id} /> : null}

      {!bite.isReference && remote ? (
        <Link className="home-action practice-action practice-cta" to={`/practice?lessons=${encodeURIComponent(bite.id)}`}>
          <span className="home-action-icon">
            <AppIcon name="chat" size={22} />
          </span>
          <span className="home-action-text">
            <b>Practice this lesson</b>
            <span>Answer its open questions in your own words and get AI feedback</span>
          </span>
          <span className="home-action-arrow" aria-hidden>
            →
          </span>
        </Link>
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
              celebrateLesson();
            }}
          >
            <AppIcon name="check" size={19} /> {state?.rating === 'got_it' ? 'Marked as learned' : 'I learned this material'}
          </button>
          {showMastery ? (
            <div className="mastery-moment" role="status">
              <span className="mastery-icon reward-pop">
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
