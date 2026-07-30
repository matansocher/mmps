import { AnimatePresence, motion } from 'framer-motion';
import type { Country } from '../types';

type Props = {
  readonly target: Country;
};

export function TargetCard({ target }: Props) {
  return (
    <div className="pointer-events-none flex flex-col items-center">
      <span className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Find this country</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={target.alpha3}
          initial={{ y: -14, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-bg-card px-5 py-2.5 shadow-glow backdrop-blur-xl"
        >
          <span className="text-3xl">{target.emoji}</span>
          <span className="text-xl font-bold tracking-tight">{target.name}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
