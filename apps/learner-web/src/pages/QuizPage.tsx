import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { useProgress } from '../hooks/useProgress';
import { getBite } from '../lib/bites';
import { quizzesForBite } from '../lib/quizzes';

export function QuizPage() {
  const { biteId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { rateBite, setQuizPassed } = useProgress();

  const bite = useMemo(() => getBite(biteId), [biteId]);
  const questions = useMemo(() => quizzesForBite(biteId), [biteId]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const q = questions[index];

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

  if (!bite || questions.length === 0) {
    return (
      <div className="empty">
        <div className="big">
          <AppIcon name="unknown" />
        </div>
        <p>No quiz available for this section yet.</p>
        <Link className="btn" to="/browse">
          Back to browse
        </Link>
      </div>
    );
  }

  const answered = selected !== null;

  function choose(originalIndex: number) {
    if (answered) return;
    setSelected(originalIndex);
    if (originalIndex === q.answerIndex) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      const passed = correctCount / questions.length >= 0.7;
      setQuizPassed(bite!.id, passed);
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  if (done) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const passed = pct >= 70;
    return (
      <div className="quiz-result">
        <div className={`big quiz-result-icon ${passed ? 'passed' : ''}`}>
          <AppIcon name={passed ? 'target' : 'book'} />
        </div>
        <div className="score">
          {correctCount}/{questions.length}
        </div>
        <p>{passed ? 'Nice — you know this section well!' : 'Worth another read. You\u2019ll get it next time.'}</p>
        <div className="quiz-result-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              rateBite(bite.id, 'got_it');
              navigate('/');
            }}
          >
            <AppIcon name="check" size={19} /> Mark learned &amp; return to Today
          </button>
          <Link className="btn" to={`/bite/${encodeURIComponent(bite.id)}`} state={location.state}>
            Reread section
          </Link>
          <button
            type="button"
            className="btn subtle"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setDone(false);
              setAttempt((a) => a + 1);
            }}
          >
            Retry quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="reader-top">
        <Link className="back-link" to={`/bite/${encodeURIComponent(bite.id)}`} state={location.state}>
          ← Back to section
        </Link>
      </div>
      <div className="page-head">
        <h1 style={{ fontSize: 22 }}>{bite.title}</h1>
      </div>

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
            <button key={originalIndex} type="button" className={cls} disabled={answered} onClick={() => choose(originalIndex)}>
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
    </div>
  );
}
