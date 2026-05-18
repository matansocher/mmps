import { motion } from 'framer-motion';

type Props = {
  following: boolean;
  busy?: boolean;
  onToggle: () => void;
  ariaLabel?: string;
};

export function FollowStar({ following, busy, onToggle, ariaLabel }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      animate={{ scale: 1 }}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!busy) onToggle();
      }}
      aria-label={ariaLabel ?? (following ? 'הסר מעקב' : 'הוסף למעקב')}
      aria-pressed={following}
      className={`w-9 h-9 grid place-items-center rounded-full transition-colors ${busy ? 'opacity-60' : 'hover:bg-bg-elevated'}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6"
        fill={following ? '#FFD600' : 'none'}
        stroke={following ? '#FFD600' : '#64748B'}
        strokeWidth="1.75"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </motion.button>
  );
}
