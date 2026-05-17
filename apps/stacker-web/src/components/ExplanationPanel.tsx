import { motion } from 'framer-motion';

type Props = { explanation: string; correctAnswer?: string };

export function ExplanationPanel({ explanation, correctAnswer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-4"
    >
      {correctAnswer && (
        <div className="text-sm text-gray-400 mb-2">
          Correct answer: <code className="text-green-300 bg-green-500/10 px-1.5 py-0.5 rounded">{correctAnswer}</code>
        </div>
      )}
      <div className="text-sm text-gray-300 leading-relaxed">{explanation}</div>
    </motion.div>
  );
}
