import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { BiteCard } from '../components/BiteCard';
import { useProgress } from '../hooks/useProgress';
import { GUIDES, bitesByGuide } from '../lib/bites';
import { biteStatus } from '../lib/scheduler';
import type { GuideId } from '../lib/types';

const GUIDE_ORDER: ReadonlyArray<GuideId> = ['system-design', 'ai-engineering'];

export function BrowsePage() {
  const { progress } = useProgress();
  const now = useMemo(() => new Date(), []);
  const [active, setActive] = useState<GuideId>('system-design');

  const bites = useMemo(() => bitesByGuide(active), [active]);

  return (
    <div>
      <div className="page-head">
        <h1>
          <AppIcon name="browse" /> Browse
        </h1>
        <p className="lead">Every section from both guides. Tap any card to read it.</p>
      </div>

      <div className="guide-switcher" role="group" aria-label="Choose a guide">
        {GUIDE_ORDER.map((guide) => (
          <button
            key={guide}
            type="button"
            className={`btn ${active === guide ? 'primary' : ''}`}
            onClick={() => setActive(guide)}
          >
            <AppIcon name={guide} size={19} /> {GUIDES[guide].label}
          </button>
        ))}
      </div>
      <Link className="map-entry" to="/map">
        <span>
          <strong>See the full knowledge map</strong>
          <small>View both curricula and your progress</small>
        </span>
        <AppIcon name="map" size={22} />
      </Link>

      {bites.map((bite) => (
        <BiteCard key={bite.id} bite={bite} status={biteStatus(progress.states[bite.id], now)} from="/browse" />
      ))}
    </div>
  );
}
