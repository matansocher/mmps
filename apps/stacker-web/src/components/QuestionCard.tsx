import { motion } from 'framer-motion';
import type { QuestionDto, AnswerResponse } from '../types';
import { CodeBlock } from './CodeBlock';
import { OptionButton } from './OptionButton';
import { FillInInput } from './FillInInput';

type Props = {
  question: QuestionDto;
  selectedOption: number | null;
  answerResult: AnswerResponse | null;
  onSelectOption: (index: number) => void;
  onSubmitText: (text: string) => void;
  state: 'question' | 'result';
};

export function QuestionCard({ question, selectedOption, answerResult, onSelectOption, onSubmitText, state }: Props) {
  const shake = answerResult && !answerResult.correct ? { x: [0, -10, 10, -10, 10, 0] } : {};
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0, ...shake }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6"
    >
      <h2 className="text-xl font-semibold text-white mb-4">{question.question}</h2>

      {question.type === 'code_output' && <CodeBlock code={question.codeSnippet} />}
      {question.type === 'fill_in' && question.codeSnippet && <CodeBlock code={question.codeSnippet} />}

      {(question.type === 'multiple_choice' || question.type === 'code_output') && (
        <div className="space-y-3 mt-6">
          {question.options.map((option, index) => (
            <OptionButton
              key={index}
              option={option}
              index={index}
              isSelected={selectedOption === index}
              isCorrect={answerResult?.correctOptionIndex === index}
              isWrong={state === 'result' && selectedOption === index && answerResult?.correct === false}
              showResult={state === 'result'}
              onClick={() => state === 'question' && onSelectOption(index)}
              disabled={state === 'result'}
            />
          ))}
        </div>
      )}

      {question.type === 'fill_in' && (
        <FillInInput onSubmit={onSubmitText} disabled={state === 'result'} />
      )}
    </motion.div>
  );
}
