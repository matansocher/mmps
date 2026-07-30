import type { GameState } from '../types';
import { ROUND_SIZE } from '../types';
import { currentTarget, shouldAssist } from '../lib/game';
import { HintBar } from './HintBar';
import { TargetCard } from './TargetCard';

type Props = {
  readonly state: GameState;
};

export function GameHUD({ state }: Props) {
  const target = currentTarget(state);
  if (!target) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md items-center justify-between text-sm">
        <Stat label="Country" value={`${state.index + 1}/${ROUND_SIZE}`} />
        <Stat label="First-try" value={`${state.score}`} align="end" />
      </div>
      <TargetCard target={target} />
      <HintBar hint={state.hint} assist={shouldAssist(state)} />
    </div>
  );
}

function Stat({ label, value, align = 'start' }: { readonly label: string; readonly value: string; readonly align?: 'start' | 'end' }) {
  return (
    <div className={`flex flex-col ${align === 'end' ? 'items-end' : 'items-start'}`}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
      <span className="tabular text-lg font-bold">{value}</span>
    </div>
  );
}
