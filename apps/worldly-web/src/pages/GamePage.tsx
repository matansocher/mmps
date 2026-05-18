import { useCallback, useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { AnswerButton } from '../components/AnswerButton';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { haptic, showBackButton } from '../lib/telegram';
import type { GameAnswerResponse, GameMode, GameQuestion } from '../types';

const MODE_LABELS: Record<Exclude<GameMode, 'random'>, string> = {
  map: '🗺️ נחשו את המדינה',
  us_map: '🇺🇸 נחשו את המדינה',
  flag: '🏁 איזה דגל זה?',
  capital: '🏛️ נחשו את עיר הבירה',
};

export function GamePage() {
  const [, params] = useRoute<{ mode: string }>('/play/:mode');
  const [, setLocation] = useLocation();
  const mode = (params?.mode ?? 'random') as GameMode;

  const [question, setQuestion] = useState<GameQuestion | null>(null);
  const [answer, setAnswer] = useState<GameAnswerResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const goBack = useCallback(() => setLocation('/'), [setLocation]);

  const loadNext = useCallback(async () => {
    setQuestion(null);
    setAnswer(null);
    setSelected(null);
    setError(null);
    setLoading(true);
    try {
      const next = await api.newGame(mode);
      setQuestion(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const cleanup = showBackButton(goBack);
    loadNext();
    return cleanup;
  }, [loadNext, goBack]);

  const onSelect = async (optionId: string) => {
    if (!question || answer) return;
    setSelected(optionId);
    try {
      const res = await api.answer(question.gameId, optionId);
      setAnswer(res);
      haptic(res.correct ? 'success' : 'error');
    } catch (e) {
      setError(String(e));
    }
  };

  const titleText = question ? MODE_LABELS[question.mode] : MODE_LABELS[mode === 'random' ? 'map' : (mode as Exclude<GameMode, 'random'>)];

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-3 sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10 flex items-center gap-3">
        <button
          onClick={goBack}
          aria-label="חזרה"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-card border border-border-subtle text-text-primary active:scale-95 transition-transform"
        >
          →
        </button>
        <h1 className="text-text-primary font-semibold text-base flex-1">{titleText}</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {loading && !question && <EmptyState title="טוען משחק..." />}
        {error && <EmptyState title="שגיאה" hint={error} />}

        {question && (
          <>
            <section className="rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
              {question.prompt.imageUrl && (
                <img src={question.prompt.imageUrl} alt="" className="w-full aspect-square object-contain bg-white" />
              )}
              {question.prompt.flagEmoji && (
                <div className="flex items-center justify-center py-10 text-7xl">{question.prompt.flagEmoji}</div>
              )}
              {question.prompt.text && (
                <div className="px-4 py-3 text-center text-text-primary text-base">{question.prompt.text}</div>
              )}
            </section>

            <section className="space-y-2">
              {question.options.map((opt) => {
                let status: 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal' = 'idle';
                if (answer) {
                  if (opt.id === answer.correctId) status = 'correct';
                  else if (opt.id === selected) status = 'wrong';
                } else if (opt.id === selected) {
                  status = 'selected';
                }
                return (
                  <AnswerButton
                    key={opt.id}
                    label={opt.label}
                    status={status}
                    disabled={!!answer}
                    onClick={() => onSelect(opt.id)}
                  />
                );
              })}
            </section>

            {answer && (
              <section className="rounded-xl bg-bg-card border border-border-subtle px-4 py-3 text-center">
                <div className={`font-semibold ${answer.correct ? 'text-accent-ok' : 'text-accent-bad'}`}>
                  {answer.correct ? '✅ נכון!' : '❌ טעות'}
                </div>
                {!answer.correct && (
                  <div className="text-text-secondary text-sm mt-1">
                    התשובה הנכונה: {answer.correctEmoji ? `${answer.correctEmoji} ` : ''}{answer.correctLabel}
                    {answer.correctHebrewCapital ? ` — ${answer.correctHebrewCapital}` : ''}
                  </div>
                )}
              </section>
            )}

            {answer && (
              <button
                onClick={loadNext}
                className="w-full rounded-2xl bg-accent-brand text-white font-bold text-lg py-4 active:scale-[0.99] transition-transform"
              >
                המשך ←
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
