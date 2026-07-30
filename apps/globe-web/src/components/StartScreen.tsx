import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Continent } from '../types';

type Props = {
  readonly continents: readonly Continent[];
  readonly selectedContinent: Continent | null;
  readonly onSelectContinent: (continent: Continent | null) => void;
  readonly onStart: () => void;
};

export function StartScreen({ continents, selectedContinent, onSelectContinent, onStart }: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      <motion.div
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-bg-card p-8 text-center shadow-glow backdrop-blur-xl"
        initial={{ y: 24, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="mb-2 text-5xl">🌍</div>
        <h1 className="text-2xl font-bold tracking-tight">Guess the Country</h1>
        <p className="mt-2 text-sm text-text-secondary">
          You get a country name — find it on the globe and click it. Spin, zoom, and follow the hot/cold hints. 10 countries per round.
        </p>

        <div className="mt-6 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Region</p>
          <div className="flex flex-wrap gap-2">
            <ChipButton active={selectedContinent === null} onClick={() => onSelectContinent(null)}>
              🌐 World
            </ChipButton>
            {continents.map((c) => (
              <ChipButton key={c} active={selectedContinent === c} onClick={() => onSelectContinent(c)}>
                {c}
              </ChipButton>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          className="mt-7 w-full rounded-2xl bg-accent-brand py-3.5 text-base font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Play
        </button>
      </motion.div>
    </motion.div>
  );
}

function ChipButton({ active, onClick, children }: { readonly active: boolean; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? 'border-accent-brand bg-accent-brand/20 text-text-primary' : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/25'
      }`}
    >
      {children}
    </button>
  );
}
