import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { useProgress } from '../hooks/useProgress';
import { GUIDES, bitesByGuide } from '../lib/bites';
import { summarize } from '../lib/scheduler';
import { selectMemorySparkBite } from '../lib/selection';
import type { GuideId } from '../lib/types';

const GUIDE_ORDER: ReadonlyArray<GuideId> = ['system-design', 'ai-engineering'];

export function TodayPage() {
  const { progress, remote } = useProgress();
  const now = useMemo(() => new Date(), []);
  const sparkReady = useMemo(() => Boolean(selectMemorySparkBite(progress, now)), [progress, now]);
  const courses = useMemo(
    () =>
      GUIDE_ORDER.map((guide) => {
        const ids = bitesByGuide(guide).map((bite) => bite.id);
        const summary = summarize(progress, ids, now);
        const pct = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;
        const started = summary.total - summary.notStarted;
        const startedPct = summary.total ? Math.round((started / summary.total) * 100) : 0;
        return { guide, meta: GUIDES[guide], summary, pct, startedPct };
      }),
    [progress, now],
  );

  return (
    <div>
      {!remote ? <div className="banner local">Studying locally — open inside Telegram to sync your progress across devices.</div> : null}

      <div className="course-head">
        <h1>Your courses</h1>
        <p>Pick up where you left off.</p>
      </div>
      <div className="course-cards">
        {courses.map((course) => (
          <Link key={course.guide} className={`course-card ${course.guide === 'system-design' ? 'course-sd' : 'course-ai'}`} to={`/map?guide=${course.guide}`}>
            <div className="course-top">
              <span className="course-title">
                <span className="course-icon">
                  <AppIcon name={course.guide} />
                </span>
                {course.meta.label}
              </span>
              <div className="ring small" style={{ ['--p' as string]: course.pct }} aria-label={`${course.pct}% mastered`}>
                <span>{course.pct}%</span>
              </div>
            </div>
            <div className="course-bar" aria-hidden>
              <span className="course-bar-started" style={{ width: `${course.startedPct}%` }} />
              <span className="course-bar-mastered" style={{ width: `${course.pct}%` }} />
            </div>
            <span className="course-sub">
              {course.summary.mastered}/{course.summary.total} lessons mastered
            </span>
            <div className="course-stats">
              <span className="stat learning">
                <b>{course.summary.learning}</b> learning
              </span>
              <span className="stat due">
                <b>{course.summary.due}</b> due
              </span>
              <span className="stat">
                <b>{course.summary.notStarted}</b> new
              </span>
            </div>
            <span className="course-continue">
              {course.summary.notStarted === course.summary.total ? 'Start course' : 'Continue'} <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="home-actions">
        <Link className="home-action primary-action" to="/map">
          <span className="home-action-icon">
            <AppIcon name="map" size={22} />
          </span>
          <span className="home-action-text">
            <b>Explore your knowledge map</b>
            <span>See every topic and continue learning</span>
          </span>
          <span className="home-action-arrow" aria-hidden>
            →
          </span>
        </Link>
        <Link className="home-action practice-action" to="/practice">
          <span className="home-action-icon">
            <AppIcon name="chat" size={22} />
          </span>
          <span className="home-action-text">
            <b>Practice with AI</b>
            <span>Answer open questions and get graded by a tutor</span>
          </span>
          <span className="home-action-arrow" aria-hidden>
            →
          </span>
        </Link>
        <Link className={`home-action spark-action ${sparkReady ? '' : 'idle'}`} to="/spark">
          <span className="home-action-icon">
            <AppIcon name="brain" size={22} />
          </span>
          <span className="home-action-text">
            <b>Memory Spark</b>
            <span>{sparkReady ? 'One quick recall question from what you read' : 'Unlocks after you read your first bite'}</span>
          </span>
          <span className="home-action-arrow" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
