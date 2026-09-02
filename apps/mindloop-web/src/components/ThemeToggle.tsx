import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`ml-tap flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-lg shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-white dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/20 ${className}`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        aria-hidden
      >
        {isDark ? '🌙' : '☀️'}
      </motion.span>
    </button>
  );
}
