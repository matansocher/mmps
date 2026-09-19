import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { BiteCard } from '../components/BiteCard';
import { MemorySpark } from '../components/MemorySpark';
import { useProgress } from '../hooks/useProgress';
import { CURRICULUM, GUIDES, bitesByGuide, getBite } from '../lib/bites';
import { biteStatus, summarize } from '../lib/scheduler';
import { getTodayPlanBites, selectReviewQueue } from '../lib/selection';
import type { GuideId } from '../lib/types';

const GUIDE_ORDER: ReadonlyArray<GuideId> = ['system-design', 'ai-engineering'];

export function TodayPage() {
  const { progress, remote } = useProgress();
  const now = useMemo(() => new Date(), []);
  const todayIds = useMemo(() => getTodayPlanBites(progress, now), [progress, now]);
  const reviewIds = useMemo(() => selectReviewQueue(progress, now), [progress, now]);
  const summary = useMemo(() => summarize(progress, CURRICULUM, now), [progress, now]);
  const pct = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;
  const courses = useMemo(
    () =>
      GUIDE_ORDER.map((guide) => {
        const ids = bitesByGuide(guide).map((bite) => bite.id);
        const courseSummary = summarize(progress, ids, now);
        const coursePct = courseSummary.total ? Math.round((courseSummary.mastered / courseSummary.total) * 100) : 0;
        return { guide, meta: GUIDES[guide], summary: courseSummary, pct: coursePct };
      }),
    [progress, now],
  );

  return (
    <div>
      {!remote ? <div className="banner local">Studying locally — open inside Telegram to sync your progress across devices.</div> : null}

      <div className="today-hero">
        <span className="eyebrow">Your daily learning journey</span>
        <h1>
          <AppIcon name="today" /> Learn something. Recall it. Finish strong.
        </h1>
        <p>A focused sequence built from your curriculum and review schedule.</p>
        <Link className="btn primary browse-cta" to="/map">
          <AppIcon name="map" size={19} /> Explore your knowledge map
        </Link>
      </div>

      <div className="progress-wrap" aria-label={`${pct}% of all courses mastered`}>
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

      <div className="daily-journey">
        <section className="journey-card" aria-labelledby="learn-step-title">
          <div className="journey-card-heading">
            <span className="journey-number">1</span>
            <div>
              <h2 id="learn-step-title">Learn</h2>
              <p>{todayIds.length ? `${todayIds.length} short bite${todayIds.length > 1 ? 's' : ''} selected for today` : 'Today’s planned learning is complete'}</p>
            </div>
          </div>
          {todayIds.length ? (
            todayIds.map((id) => {
              const bite = getBite(id);
              return bite ? <BiteCard key={id} bite={bite} status={biteStatus(progress.states[id], now)} from="/" /> : null;
            })
          ) : (
            <div className="journey-complete">
              <AppIcon name="complete" size={24} />
              <span>You finished today&apos;s planned bites.</span>
            </div>
          )}
        </section>

        <MemorySpark now={now} />

        <section className="journey-card journey-finish" aria-labelledby="finish-step-title">
          <div className="journey-card-heading">
            <span className="journey-number">3</span>
            <div>
              <h2 id="finish-step-title">Finish</h2>
              <p>{todayIds.length === 0 ? 'Journey complete — keep exploring if you have time.' : 'Complete your bites and Memory Spark to close the loop.'}</p>
            </div>
          </div>
          <div className="finish-actions">
            {reviewIds.length > 0 ? (
              <Link className="btn" to="/review">
                <AppIcon name="review" size={18} /> Review {reviewIds.length} due
              </Link>
            ) : null}
            <Link className="btn" to="/browse">
              <AppIcon name="browse" size={18} /> Browse all bites
            </Link>
          </div>
        </section>
      </div>

      <div className="course-head">
        <h2>Your courses</h2>
        <p>Track each curriculum or open the map to see how every topic connects.</p>
      </div>
      <div className="course-cards">
        {courses.map((course) => (
          <Link key={course.guide} className="course-card" to="/map">
            <div className="course-info">
              <span className="course-title">
                <span className="course-icon">
                  <AppIcon name={course.guide} />
                </span>
                {course.meta.label}
              </span>
              <span className="course-sub">
                {course.summary.mastered}/{course.summary.total} lessons mastered
              </span>
            </div>
            <div className="ring small" style={{ ['--p' as string]: course.pct }}>
              <span>{course.pct}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
