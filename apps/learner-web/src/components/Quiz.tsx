import { useState } from 'react';
import type { Quiz } from '../data/courses';
import { haptic } from '../lib/telegram';

function QuizCard({ quiz, index }: { readonly quiz: Quiz; readonly index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
      <div className="text-sm font-semibold text-text-primary">
        <span className="text-text-muted">Q{index + 1}.</span> {quiz.question}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {quiz.options.map((opt, i) => {
          let cls = 'border-border-subtle text-text-secondary hover:border-border-strong';
          if (answered) {
            if (opt.correct) cls = 'border-accent-success bg-accent-success/10 text-text-primary';
            else if (i === picked) cls = 'border-accent-danger bg-accent-danger/10 text-text-primary';
            else cls = 'border-border-subtle text-text-muted';
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                haptic(opt.correct ? 'success' : 'error');
              }}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${cls}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {answered && <div className="mt-3 rounded-xl bg-bg-elevated p-3 text-sm text-text-muted">{quiz.explain}</div>}
    </div>
  );
}

export function QuizSection({ quizzes }: { readonly quizzes: readonly Quiz[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Final Quiz</h2>
        <p className="mt-1 text-sm text-text-muted">{quizzes.length} questions to test what you've learned.</p>
      </div>
      {quizzes.map((quiz, i) => (
        <QuizCard key={i} quiz={quiz} index={i} />
      ))}
    </div>
  );
}
