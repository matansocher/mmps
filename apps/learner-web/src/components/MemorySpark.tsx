import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { getBite } from '../lib/bites';
import { quizzesForBite } from '../lib/quizzes';
import { selectMemorySparkBite, selectMemorySparkQuestionIndex } from '../lib/selection';
import { AppIcon } from './AppIcon';

type MemorySparkProps = {
  readonly now: Date;
};

export function MemorySpark({ now }: MemorySparkProps) {
  const { progress } = useProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const biteId = useMemo(() => selectMemorySparkBite(progress, now), [progress, now]);
  const questions = useMemo(() => (biteId ? quizzesForBite(biteId) : []), [biteId]);
  const questionIndex = biteId ? selectMemorySparkQuestionIndex(biteId, questions.length, now) : -1;
  const question = questions[questionIndex];
  const bite = biteId ? getBite(biteId) : undefined;

  if (!bite || !question) {
    return (
      <div className="journey-card memory-spark empty-spark">
        <div className="journey-card-heading">
          <span className="journey-number">2</span>
          <div>
            <h2>Memory Spark</h2>
            <p>Your one-question recall check</p>
          </div>
        </div>
        <div className="spark-empty">
          <AppIcon name="brain" size={28} />
          <p>Read your first bite today. Once you have something to recall, a quick memory question will appear here.</p>
        </div>
      </div>
    );
  }

  const answered = selected !== null;
  return (
    <section className="journey-card memory-spark" aria-labelledby="memory-spark-title">
      <div className="journey-card-heading">
        <span className="journey-number">2</span>
        <div>
          <h2 id="memory-spark-title">Memory Spark</h2>
          <p>Recall from {bite.title}</p>
        </div>
      </div>
      <p className="spark-question">{question.question}</p>
      <div className="spark-options" role="group" aria-label="Memory Spark answers">
        {question.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = index === question.answerIndex;
          const className = answered && isCorrect ? 'spark-option correct' : answered && isSelected ? 'spark-option wrong' : 'spark-option';
          return (
            <button key={option} type="button" className={className} disabled={answered} onClick={() => setSelected(index)}>
              {option}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className={`spark-feedback ${selected === question.answerIndex ? '' : 'miss'}`} role="status">
          <strong>{selected === question.answerIndex ? 'You remembered it.' : 'Good retrieval practice.'}</strong> {question.explanation}
          <Link to={`/bite/${encodeURIComponent(bite.id)}`} state={{ from: '/' }}>
            Refresh this bite
          </Link>
        </div>
      ) : null}
    </section>
  );
}

