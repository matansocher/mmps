import { useMemo, useState } from 'react';
import type { Quiz } from '../data/courses';
import { Check, Close, Sparkles, Trophy } from '../lib/icons';
import { haptic } from '../lib/telegram';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function QuizCard({ quiz, index, onAnswer }: { readonly quiz: Quiz; readonly index: number; readonly onAnswer: (i: number, correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-card p-5">
      <div className="text-sm font-semibold text-text-primary">
        <span className="text-accent-primary">Q{index + 1}.</span> {quiz.question}
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {quiz.options.map((opt, i) => {
          let cls = 'border-border-subtle text-text-secondary hover:border-border-strong';
          let badge = 'border-border-strong text-text-muted';
          let icon: React.ReactNode = LETTERS[i];
          if (answered) {
            if (opt.correct) {
              cls = 'border-accent-success bg-accent-success/10 text-text-primary';
              badge = 'border-accent-success bg-accent-success text-bg-base';
              icon = <Check size={14} className="text-bg-base" />;
            } else if (i === picked) {
              cls = 'border-accent-danger bg-accent-danger/10 text-text-primary';
              badge = 'border-accent-danger bg-accent-danger text-bg-base';
              icon = <Close size={14} className="text-bg-base" />;
            } else {
              cls = 'border-border-subtle text-text-muted opacity-70';
            }
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                onAnswer(i, opt.correct);
                haptic(opt.correct ? 'success' : 'error');
              }}
              className={`pressable flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${cls}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${badge}`}>{icon}</span>
              <span className="min-w-0 flex-1">{opt.text}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="animate-slide-up mt-3 flex gap-2 rounded-xl bg-bg-elevated p-3 text-sm text-text-secondary">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-accent-primary" />
          <span>{quiz.explain}</span>
        </div>
      )}
    </div>
  );
}

export function QuizSection({ quizzes }: { readonly quizzes: readonly Quiz[] }) {
  const [results, setResults] = useState<Record<number, boolean>>({});

  const answeredCount = Object.keys(results).length;
  const correctCount = useMemo(() => Object.values(results).filter(Boolean).length, [results]);
  const allDone = answeredCount === quizzes.length;
  const scorePct = quizzes.length ? Math.round((correctCount / quizzes.length) * 100) : 0;

  const encouragement = scorePct === 100 ? 'Flawless — you truly own this topic.' : scorePct >= 70 ? 'Strong work. Review the misses and you are interview-ready.' : 'Good start — revisit the lessons and run it again.';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-text-primary">
            <Trophy size={22} className="text-accent-warning" /> Final Quiz
          </h2>
          <p className="mt-1 text-sm text-text-muted">{quizzes.length} questions to test what you've learned.</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-border-subtle bg-bg-card px-4 py-2 text-center">
          <div className="text-lg font-extrabold tabular-nums text-text-primary">
            {correctCount}
            <span className="text-text-muted">/{quizzes.length}</span>
          </div>
          <div className="text-[11px] font-medium text-text-muted">score</div>
        </div>
      </div>

      {quizzes.map((quiz, i) => (
        <QuizCard key={i} quiz={quiz} index={i} onAnswer={(_pick, correct) => setResults((r) => ({ ...r, [i]: correct }))} />
      ))}

      {allDone && (
        <div className="animate-pop-in flex flex-col items-center gap-2 rounded-3xl border border-accent-primary/40 bg-bg-card px-6 py-7 text-center shadow-glow">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary">
            <Trophy size={28} />
          </span>
          <div className="text-3xl font-extrabold tabular-nums text-text-primary">{scorePct}%</div>
          <p className="text-sm font-semibold text-text-secondary">
            {correctCount} of {quizzes.length} correct
          </p>
          <p className="max-w-xs text-sm text-text-muted">{encouragement}</p>
        </div>
      )}
    </div>
  );
}
