import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import { celebrateCorrect, celebrateLesson, feedbackWrong } from '../lib/celebrate';
import { quizzesForBite } from '../lib/quizzes';
import { AppIcon } from './AppIcon';

type SectionQuizProps = {
  readonly biteId: string;
};

export function SectionQuiz({ biteId }: SectionQuizProps) {
  const { setQuizPassed } = useProgress();
  const questions = useMemo(() => quizzesForBite(biteId), [biteId]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const q = questions[index];
  const passedQuiz = done && correctCount / questions.length >= 0.7;

  useEffect(() => {
    if (passedQuiz) celebrateLesson();
  }, [passedQuiz]);

  // Shuffle option order per question so the correct answer isn't guessable from
  // its position or length. Reshuffled on each attempt (retry) and each question.
  const shuffledOptions = useMemo(() => {
    if (!q) return [];
    const items = q.options.map((text, originalIndex) => ({ text, originalIndex }));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, index, attempt]);

  if (questions.length === 0) return null;

  const answered = selected !== null;

  function choose(originalIndex: number, target: HTMLElement) {
    if (answered) return;
    setSelected(originalIndex);
    if (originalIndex === q.answerIndex) {
      setCorrectCount((c) => c + 1);
      celebrateCorrect(target);
    } else {
      feedbackWrong();
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      setQuizPassed(biteId, correctCount / questions.length >= 0.7);
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  function retry() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setDone(false);
    setAttempt((a) => a + 1);
  }

  return (
    <section className="section-quiz" aria-labelledby="section-quiz-title">
      <h2 id="section-quiz-title" className="section-quiz-title">
        <AppIcon name="brain" size={19} /> Check your understanding
      </h2>

      {done ? (
        <div className="quiz-q quiz-result">
          <div className={`quiz-result-icon ${passedQuiz ? 'passed reward-pop' : ''}`}>
            <AppIcon name={passedQuiz ? 'target' : 'book'} />
          </div>
          <div className="score">
            {correctCount}/{questions.length}
          </div>
          <p>{passedQuiz ? 'Nice — you know this section well!' : 'Worth another read. You\u2019ll get it next time.'}</p>
          <div className="quiz-result-actions">
            <button type="button" className="btn subtle" onClick={retry}>
              Retry quiz
            </button>
          </div>
        </div>
      ) : (
        <div className="quiz-q">
          <div className="quiz-progress">
            Question {index + 1} of {questions.length}
          </div>
          <div className="quiz-question">{q.question}</div>
          {shuffledOptions.map(({ text, originalIndex }) => {
            let cls = 'quiz-opt';
            if (answered && originalIndex === q.answerIndex) cls += ' correct';
            else if (answered && originalIndex === selected) cls += ' wrong';
            return (
              <button key={originalIndex} type="button" className={cls} disabled={answered} onClick={(event) => choose(originalIndex, event.currentTarget)}>
                {text}
              </button>
            );
          })}

          {answered ? (
            <>
              <div className={`quiz-explain ${selected === q.answerIndex ? '' : 'miss'}`}>{q.explanation}</div>
              <button type="button" className="btn primary block" style={{ marginTop: 14 }} onClick={next}>
                {index + 1 >= questions.length ? 'See results' : 'Next question'}
              </button>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
