import { useState } from 'react';
import { type Continent, CONTINENTS, type GameMode, bestScoreKey } from '../game/modes';
import { readBestScore } from '../hooks/useBestScore';

type ModeCard = {
  readonly kind: GameMode['kind'];
  readonly title: string;
  readonly description: string;
};

const CARDS: readonly ModeCard[] = [
  { kind: 'classic', title: 'Classic', description: '10 countries from anywhere on Earth. One click each.' },
  { kind: 'time-attack', title: 'Time Attack', description: 'Find as many as you can in 60 seconds. Misses and skips cost 3 s.' },
  { kind: 'continent', title: 'Continent Sprint', description: 'Pick a continent and find 10 of its countries.' },
  { kind: 'neighbours', title: 'Neighbours', description: 'Click every country that borders the highlighted one.' },
];

const bestLabel = (mode: GameMode) => {
  const best = readBestScore(bestScoreKey(mode));
  return best > 0 ? `Best ${best}` : null;
};

export function ModePicker({ onPick }: { readonly onPick: (mode: GameMode) => void }) {
  const [continents, setContinents] = useState(false);

  return (
    <section className="glass fixed top-1/2 left-1/2 z-30 max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-5 scroll-thin" aria-labelledby="mode-picker-title">
      <h1 id="mode-picker-title" className="text-center text-2xl font-semibold">
        Find the Country
      </h1>
      <p className="mt-1 text-center text-sm text-white/60">Spin the globe and click the right country. Choose a game:</p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {CARDS.map((card) => {
          const best = card.kind === 'continent' ? null : bestLabel({ kind: card.kind } as GameMode);
          const expanded = card.kind === 'continent' && continents;
          return (
            <button
              key={card.kind}
              type="button"
              aria-expanded={card.kind === 'continent' ? continents : undefined}
              className={`flex flex-col justify-start rounded-xl border px-4 py-3 text-left transition-colors hover:border-white/30 hover:bg-white/10 ${expanded ? 'border-[var(--color-accent)] bg-white/10' : 'border-white/10 bg-white/5'}`}
              onClick={() => (card.kind === 'continent' ? setContinents((open) => !open) : onPick({ kind: card.kind } as GameMode))}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{card.title}</span>
                {best && <span className="text-xs text-[#5bd27a] tabular-nums">{best}</span>}
              </div>
              <div className="mt-1 text-sm leading-snug text-white/60">{card.description}</div>
            </button>
          );
        })}
      </div>
      {continents && (
        <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Continents">
          {CONTINENTS.map((continent: Continent) => {
            const best = bestLabel({ kind: 'continent', continent });
            return (
              <button key={continent} type="button" className="chip" onClick={() => onPick({ kind: 'continent', continent })}>
                {continent}
                {best && <span className="ml-1.5 text-xs text-[#5bd27a]">{best}</span>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
