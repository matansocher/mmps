import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  accent: string;
  onDone: () => void;
}

/** A 3 · 2 · 1 · GO! overlay shown before a game starts. */
export function CountdownOverlay({ accent, onDone }: Props) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n < 0) {
      onDone();
      return;
    }
    const id = window.setTimeout(() => setN((v) => v - 1), n === 0 ? 500 : 750);
    return () => window.clearTimeout(id);
  }, [n, onDone]);

  const label = n === 0 ? 'GO!' : String(n);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center ml-app-bg">
      <AnimatePresence mode="wait">
        <motion.div
          key={n}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex h-28 w-28 items-center justify-center rounded-full text-6xl font-extrabold shadow-lg ring-4 sm:h-32 sm:w-32 sm:text-7xl"
          style={{ color: accent, boxShadow: `0 10px 40px -10px ${accent}`, ['--tw-ring-color' as string]: `${accent}33` }}
        >
          {label}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
