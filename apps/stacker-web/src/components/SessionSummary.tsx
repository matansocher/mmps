import { motion } from 'framer-motion';
import { HeartsIndicator } from './HeartsIndicator';

type Props = {
  xpEarned: number;
  totalXp: number;
  streakCount: number;
  heartsRemaining: number;
  heartsMax: number;
  onPlayAgain: () => void;
};

export function SessionSummary({ xpEarned, totalXp, streakCount, heartsRemaining, heartsMax, onPlayAgain }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6"
    >
      <h2 className="text-2xl font-bold text-center text-white mb-6">🏁 Round complete!</h2>
      <div className="space-y-4 mb-6">
        <Row label="XP earned this round" value={`+${xpEarned}`} />
        <Row label="Total XP" value={String(totalXp)} />
        <Row label="🔥 Streak" value={`${streakCount} day${streakCount === 1 ? '' : 's'}`} />
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Hearts left</span>
          <HeartsIndicator remaining={heartsRemaining} max={heartsMax} />
        </div>
      </div>
      <button
        onClick={onPlayAgain}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl"
      >
        Play again
      </button>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
