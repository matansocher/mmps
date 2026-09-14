import { useMemo, useState } from 'react';
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

      <div className="tabbar" style={{ position: 'static', border: 'none', background: 'none', padding: 0, marginBottom: 16, justifyContent: 'flex-start', gap: 8 }}>
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

      {bites.map((bite) => (
        <BiteCard key={bite.id} bite={bite} status={biteStatus(progress.states[bite.id], now)} />
      ))}
    </div>
  );
}
