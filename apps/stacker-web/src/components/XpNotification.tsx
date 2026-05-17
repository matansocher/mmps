import { motion } from 'framer-motion';

type Props = { xp: number };

export function XpNotification({ xp }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
    >
      +{xp} XP
    </motion.div>
  );
}
