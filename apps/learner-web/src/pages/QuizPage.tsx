import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { useProgress } from '../hooks/useProgress';
import { getBite } from '../lib/bites';
import { quizzesForBite } from '../lib/quizzes';

export function QuizPage() {
  const { biteId = '' } = useParams();
  const navigate = useNavigate();
  const { setQuizPassed } = useProgress();

  const bite = useMemo(() => getBite(biteId), [biteId]);
  const questions = useMemo(() => quizzesForBite(biteId), [biteId]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

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

  const q = questions[index];
  const answered = selected !== null;

  function choose(optionIndex: number) {
    if (answered) return;
    setSelected(optionIndex);
    if (optionIndex === q.answerIndex) setCorrectCount((c) => c + 1);
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
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <Link className="btn" to={`/bite/${encodeURIComponent(bite.id)}`}>
            Reread section
          </Link>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setCorrectCount(0);
              setDone(false);
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
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
      <div className="page-head">
        <h1 style={{ fontSize: 22 }}>{bite.title}</h1>
      </div>

      <div className="quiz-q">
        <div className="quiz-progress">
          Question {index + 1} of {questions.length}
        </div>
        <div className="quiz-question">{q.question}</div>
        {q.options.map((opt, i) => {
          let cls = 'quiz-opt';
          if (answered && i === q.answerIndex) cls += ' correct';
          else if (answered && i === selected) cls += ' wrong';
          return (
            <button key={i} type="button" className={cls} disabled={answered} onClick={() => choose(i)}>
              {opt}
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
