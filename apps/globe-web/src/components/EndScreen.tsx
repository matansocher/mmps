import { motion } from 'framer-motion';
import { ROUND_SIZE } from '../types';
import { rateRound } from '../lib/game';

type Props = {
  readonly score: number;
  readonly solved: number;
  readonly onPlayAgain: () => void;
  readonly onChangeRegion: () => void;
};

export function EndScreen({ score, solved, onPlayAgain, onChangeRegion }: Props) {
  const rating = rateRound(score, ROUND_SIZE);

  return (
    <motion.div className="absolute inset-0 z-20 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      <motion.div
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-bg-card p-8 text-center shadow-glow backdrop-blur-xl"
        initial={{ y: 24, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <motion.div className="text-6xl" initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          {rating.emoji}
        </motion.div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">{rating.title}</h2>

        <div className="mt-6 flex justify-center gap-8">
          <Metric value={`${score}/${ROUND_SIZE}`} label="First try" />
          <Metric value={`${solved}/${ROUND_SIZE}`} label="Found" />
        </div>

        <button
          onClick={onPlayAgain}
          className="mt-8 w-full rounded-2xl bg-accent-brand py-3.5 text-base font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Play again
        </button>
        <button onClick={onChangeRegion} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-text-secondary transition hover:border-white/25">
          Change region
        </button>
      </motion.div>
    </motion.div>
  );
}

function Metric({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular text-3xl font-bold">{value}</span>
      <span className="mt-1 text-xs uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}
