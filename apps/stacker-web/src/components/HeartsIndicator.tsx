import { motion } from 'framer-motion';

type Props = { remaining: number; max: number };

export function HeartsIndicator({ remaining, max }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < remaining;
        return (
          <motion.span
            key={i}
            animate={filled ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
            transition={{ duration: 0.3 }}
            className="text-xl"
          >
            {filled ? '❤️' : '🤍'}
          </motion.span>
        );
      })}
    </div>
  );
}
