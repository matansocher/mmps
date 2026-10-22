import { type ReactNode, useCallback, useState } from 'react';
import { useKeyboard } from '../hooks/useKeyboard';
import { ConfirmLeave, type LeaveGuard } from './ConfirmLeave';
import { Icon } from './Icon';

type Props = {
  readonly eyebrow: string;
  readonly progress?: ReactNode;
  readonly count?: ReactNode;
  readonly aside?: ReactNode;
  readonly leaveGuard?: LeaveGuard | null;
  readonly onChangeMode: () => void;
  readonly children?: ReactNode;
};

// Slim HUD: close · progress · count · score on one line, then the round content.
export function GameCard({ eyebrow, progress, count, aside, leaveGuard, onChangeMode, children }: Props) {
  const [confirming, setConfirming] = useState(false);
  const requestLeave = useCallback(() => (leaveGuard ? setConfirming(true) : onChangeMode()), [leaveGuard, onChangeMode]);
  useKeyboard({ m: () => !confirming && requestLeave() });

  return (
    <>
      <section className="panel animate-rise hud-top fixed left-1/2 z-20 w-[min(560px,calc(100vw-16px))] -translate-x-1/2 rounded-[18px] px-3 pt-2 pb-3.5 sm:px-4">
        <div className="flex items-center gap-2.5 text-[14px] tabular-nums">
          <button type="button" className="icon-btn -ml-1 shrink-0 text-white/80 hover:text-white" aria-label="Back to menu" title="Back to menu (M)" onClick={requestLeave}>
            <Icon name="close" size={20} />
          </button>
          <div className="min-w-0 flex-1">{progress}</div>
          {count && <span className="shrink-0 font-bold text-white/85">{count}</span>}
          {aside && <span className="chip shrink-0">{aside}</span>}
        </div>
        <div className="px-1" aria-live="polite">
          <p className="eyebrow mt-1 truncate">{eyebrow}</p>
          {children}
        </div>
      </section>
      {confirming && leaveGuard && <ConfirmLeave guard={leaveGuard} onLeave={onChangeMode} onStay={() => setConfirming(false)} />}
    </>
  );
}
