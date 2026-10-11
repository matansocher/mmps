import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import { localDateKey } from '../lib/scheduler';
import { AppIcon } from './AppIcon';

const DAY_MS = 24 * 60 * 60 * 1000;

export function StreakBadge() {
  const { progress } = useProgress();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const now = new Date();
  const today = localDateKey(now);
  const yesterday = localDateKey(new Date(now.getTime() - DAY_MS));
  const studiedToday = progress.lastStudyDate === today;
  const streak = studiedToday || progress.lastStudyDate === yesterday ? progress.streak : 0;
  const days = `${streak} day${streak === 1 ? '' : 's'}`;
  const label = studiedToday ? `${days} learning streak. You studied today.` : `${days} learning streak. Study today to keep it going.`;

  return (
    <div className="streak-wrap" ref={ref}>
      <button type="button" className={`streak ${studiedToday ? 'lit' : 'pending'}`} aria-label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <AppIcon name="fire" size={17} />
        <b>{streak}</b>
        <span className="streak-unit">{streak === 1 ? 'day' : 'days'}</span>
      </button>
      {open ? (
        <div className="streak-pop" role="dialog" aria-label="Learning streak">
          <strong>
            <AppIcon name="fire" size={16} /> {days} learning streak
          </strong>
          <p>The number of days in a row you&apos;ve finished a bite, quiz or review.</p>
          <p className={`streak-status ${studiedToday ? 'done' : ''}`}>
            {studiedToday ? '✓ Today counts. Come back tomorrow to grow it.' : streak > 0 ? 'Learn something today to keep your streak going.' : 'Learn something today to start a new streak.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
