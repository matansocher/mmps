import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { AnswerResponse, NextQuestionResponse, QuestionDto } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { ProgressBar } from '../components/ProgressBar';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { XpNotification } from '../components/XpNotification';
import { hapticError, hapticSuccess } from '../lib/telegram';

type PageState = 'loading' | 'question' | 'result';

export function RoundPage() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<PageState>('loading');
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [progress, setProgress] = useState({ answered: 0, remaining: 0, total: 0 });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    api.me().then((m) => {
      if (!m.activeSession) {
        navigate('/');
        return;
      }
      setSessionId(m.activeSession.id);
      loadNext(m.activeSession.id);
    });
  }, [navigate]);

  async function loadNext(id: string) {
    setState('loading');
    const res: NextQuestionResponse = await api.nextQuestion(id);
    if (res.complete) {
      navigate('/summary');
      return;
    }
    setQuestion(res.question);
    setProgress(res.progress);
    setSelectedOption(null);
    setAnswerResult(null);
    setState('question');
  }

  async function submitOption(index: number) {
    if (!sessionId || !question || state !== 'question') return;
    setSelectedOption(index);
    const res = await api.answer(sessionId, { questionId: question.id, selectedOption: index });
    handleAnswerResult(res);
  }

  async function submitText(text: string) {
    if (!sessionId || !question || state !== 'question') return;
    const res = await api.answer(sessionId, { questionId: question.id, text });
    handleAnswerResult(res);
  }

  function handleAnswerResult(res: AnswerResponse) {
    setAnswerResult(res);
    setState('result');
    if (res.correct) {
      hapticSuccess();
      setXpToast(20);
      setTimeout(() => setXpToast(null), 1500);
    } else {
      hapticError();
    }
    if (res.outOfHearts) {
      setTimeout(() => navigate('/out-of-hearts'), 1500);
    }
  }

  if (state === 'loading' || !question) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <ProgressBar answered={progress.answered} total={progress.total} />

      <AnimatePresence mode="wait">
        <QuestionCard
          key={question.id}
          question={question}
          selectedOption={selectedOption}
          answerResult={answerResult}
          onSelectOption={submitOption}
          onSubmitText={submitText}
          state={state === 'result' ? 'result' : 'question'}
        />
      </AnimatePresence>

      <AnimatePresence>
        {state === 'result' && answerResult && !answerResult.correct && (
          <ExplanationPanel explanation={answerResult.explanation} correctAnswer={answerResult.correctAnswer} />
        )}
      </AnimatePresence>

      {state === 'result' && !answerResult?.outOfHearts && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => sessionId && loadNext(sessionId)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-xl"
          >
            {answerResult?.correct ? 'Next question' : 'Continue'}
          </button>
        </div>
      )}

      <AnimatePresence>{xpToast !== null && <XpNotification xp={xpToast} />}</AnimatePresence>
    </div>
  );
}
