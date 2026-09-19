import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { useProgress } from '../hooks/useProgress';
import { GUIDES, bitesByGuide } from '../lib/bites';
import { biteStatus, summarize, type BiteStatus } from '../lib/scheduler';
import type { GuideId } from '../lib/types';

const GUIDE_ORDER: ReadonlyArray<GuideId> = ['system-design', 'ai-engineering'];
const STATUS_LABEL: Record<BiteStatus, string> = {
  new: 'Not started',
  learning: 'In progress',
  mastered: 'Mastered',
  due: 'Due for review',
};

export function KnowledgeMapPage() {
  const { progress } = useProgress();
  const now = useMemo(() => new Date(), []);

  return (
    <div>
      <div className="reader-top">
        <Link className="back-link" to="/">
          ← Back to Today
        </Link>
      </div>
      <div className="page-head">
        <h1>
          <AppIcon name="map" /> Knowledge map
        </h1>
        <p className="lead">Follow each curriculum from foundations to advanced topics. Every stop opens its learning bite.</p>
      </div>

      <div className="knowledge-map">
        {GUIDE_ORDER.map((guideId) => {
          const bites = bitesByGuide(guideId);
          const courseSummary = summarize(
            progress,
            bites.map((bite) => bite.id),
            now,
          );
          return (
            <section className="map-course" key={guideId} aria-labelledby={`map-${guideId}`}>
              <div className="map-course-head">
                <span className="course-icon">
                  <AppIcon name={guideId} />
                </span>
                <div>
                  <h2 id={`map-${guideId}`}>{GUIDES[guideId].label}</h2>
                  <p>
                    {courseSummary.mastered} of {courseSummary.total} mastered
                  </p>
                </div>
              </div>
              <ol className="map-path">
                {bites.map((bite, index) => {
                  const status = biteStatus(progress.states[bite.id], now);
                  return (
                    <li key={bite.id} className={`map-node ${status}`}>
                      <Link to={`/bite/${encodeURIComponent(bite.id)}`} state={{ from: '/map' }}>
                        <span className="map-marker" aria-hidden>
                          {status === 'mastered' ? <AppIcon name="check" size={18} /> : index + 1}
                        </span>
                        <span className="map-copy">
                          <strong>{bite.title}</strong>
                          <span>{STATUS_LABEL[status]} · {bite.minutes} min</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

