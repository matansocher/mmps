import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { BiteCard } from '../components/BiteCard';
import { useProgress } from '../hooks/useProgress';
import { CURRICULUM, GUIDES, bitesByGuide, getBite } from '../lib/bites';
import { biteStatus, summarize } from '../lib/scheduler';
import { selectReviewQueue, getTodayPlanBites } from '../lib/selection';
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
        <h1>
          <AppIcon name="today" /> Today&apos;s bites
        </h1>
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

      <div className="course-head">
        <h2>Today&apos;s suggestions</h2>
        <p>A small daily set picked just for you — mix of new lessons and reviews that are due. Finish these to keep your streak going.</p>
      </div>
      {todayIds.length === 0 ? (
        <div className="empty">
          <div className="big">
            <AppIcon name="complete" />
          </div>
          <p>You&apos;ve finished today&apos;s bites. Come back later or browse the full library.</p>
          <Link className="btn" to="/browse">
            Browse all sections
          </Link>
        </div>
      ) : (
        todayIds.map((id) => {
          const bite = getBite(id);
          if (!bite) return null;
          return <BiteCard key={id} bite={bite} status={biteStatus(progress.states[id], now)} />;
        })
      )}

      <div className="course-head">
        <h2>Your courses</h2>
        <p>Each course is a full subject made of many lessons. The ring shows how far you&apos;ve mastered it. Your daily suggestions above are picked from these.</p>
      </div>
      <div className="course-cards">
        {courses.map((course) => (
          <Link key={course.guide} className="course-card" to="/browse">
            <div className="course-info">
              <span className="course-title">
                <span className="course-icon">
                  <AppIcon name={course.guide} />
                </span>
                {course.meta.label}
              </span>
              <span className="course-sub">
                {course.summary.mastered}/{course.summary.total} lessons
              </span>
            </div>
            <div className="ring small" style={{ ['--p' as string]: course.pct }}>
              <span>{course.pct}%</span>
            </div>
          </Link>
        ))}
      </div>

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
