import { motion } from 'framer-motion';

type Props = {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  showResult: boolean;
  onClick: () => void;
  disabled: boolean;
};

export function OptionButton({ option, index, isSelected, isCorrect, isWrong, showResult, onClick, disabled }: Props) {
  const getStyles = () => {
    if (showResult) {
      if (isCorrect) return 'border-green-500 bg-green-500/10 text-green-300';
      if (isWrong) return 'border-red-500 bg-red-500/10 text-red-300';
      return 'border-gray-700 text-gray-500';
    }
    if (isSelected) return 'border-primary-500 bg-primary-500/10 text-white';
    return 'border-gray-700 hover:border-gray-600 text-gray-300';
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      animate={isWrong ? { x: [0, -5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${getStyles()} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <span className="text-sm font-medium text-gray-500 mr-3">{String.fromCharCode(65 + index)}.</span>
      <span className="font-mono text-sm">{option}</span>
    </motion.button>
  );
}
