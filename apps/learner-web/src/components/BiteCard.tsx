import { Link } from 'react-router-dom';
import type { Bite } from '../lib/types';
import type { BiteStatus } from '../lib/scheduler';

const STATUS_LABEL: Record<BiteStatus, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
  due: 'Due for review',
};

type BiteCardProps = {
  readonly bite: Bite;
  readonly status: BiteStatus;
  readonly guideIcon: string;
};

export function BiteCard({ bite, status, guideIcon }: BiteCardProps) {
  const guideChipClass = bite.guide === 'system-design' ? 'guide-sd' : 'guide-ai';
  return (
    <Link className="bite-card" to={`/bite/${encodeURIComponent(bite.id)}`}>
      <span className="guide-icon" aria-hidden>
        {guideIcon}
      </span>
      <span className="bite-main">
        <span className="bite-title">{bite.title}</span>
        {bite.subtitle ? <span className="bite-sub">{bite.subtitle}</span> : null}
        <span className="bite-meta">
          <span className={`status-dot ${status}`} title={STATUS_LABEL[status]} />
          <span className="chip">{STATUS_LABEL[status]}</span>
          <span className={`chip ${guideChipClass}`}>{bite.guide === 'system-design' ? 'System Design' : 'AI Eng'}</span>
          {bite.isReference ? <span className="chip ref">Reference</span> : null}
          <span className="chip">{bite.minutes} min</span>
        </span>
      </span>
    </Link>
  );
}
