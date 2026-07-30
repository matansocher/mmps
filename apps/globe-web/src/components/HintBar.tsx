import { AnimatePresence, motion } from 'framer-motion';
import type { MissHint } from '../types';
import { TEMPERATURE_META, formatDistance } from '../lib/geo';

type Props = {
  readonly hint: MissHint | null;
  readonly assist: boolean;
};

export function HintBar({ hint, assist }: Props) {
  return (
    <div className="pointer-events-none flex min-h-[2.25rem] items-center justify-center">
      <AnimatePresence mode="wait">
        {hint && (
          <motion.div
            key={`${hint.guessedName}-${hint.distanceKm}`}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-sm backdrop-blur-md"
            style={{ color: TEMPERATURE_META[hint.temperature].color }}
          >
            <span className="text-base">{TEMPERATURE_META[hint.temperature].emoji}</span>
            <span className="font-semibold">{TEMPERATURE_META[hint.temperature].label}</span>
            <span className="text-text-secondary">· {formatDistance(hint.distanceKm)} away</span>
            {assist && <span className="text-accent-hint">· look at the highlighted region</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
