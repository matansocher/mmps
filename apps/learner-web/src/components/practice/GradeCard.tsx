import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../AppIcon';
import type { PracticeAttempt, PracticeGrade } from '../../lib/practice';
import { scoreColorVar, verdictLabel, verdictTone } from '../../lib/practice';
import { RichInline, RichText } from './RichText';

type GradeCardProps = {
  readonly grade: PracticeGrade;
  readonly question: PracticeAttempt['question'];
};

function PointList({ title, items, tone }: { readonly title: string; readonly items: readonly string[]; readonly tone: 'good' | 'mid' | 'bad' }) {
  if (items.length === 0) return null;
  return (
    <section className={`grade-points ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <AppIcon name={tone === 'good' ? 'check' : tone === 'mid' ? 'unknown' : 'nope'} size={15} />
            <span>
              <RichInline text={item} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GradeCard({ grade, question }: GradeCardProps) {
  const tone = verdictTone(grade);
  const [referenceOpen, setReferenceOpen] = useState(true);

  return (
    <article className={`grade-card tone-${tone}`} aria-label={`Grade: ${verdictLabel(grade)}`}>
      <header className="grade-head">
        {!grade.skipped && (
          <div className="score-ring" style={{ ['--score' as string]: grade.score, ['--score-color' as string]: scoreColorVar(grade.score) }} role="img" aria-label={`Score ${grade.score} out of 100`}>
            <span>{grade.score}</span>
          </div>
        )}
        <div className="grade-head-text">
          <span className={`verdict-chip ${tone}`}>{verdictLabel(grade)}</span>
          {question.lessonTitle && question.biteId && (
            <Link className="grade-lesson" to={`/bite/${question.biteId}`}>
              <AppIcon name="book" size={14} />
              {question.lessonTitle}
            </Link>
          )}
        </div>
      </header>

      {!grade.skipped && grade.explanation && (
        <div className="grade-explanation">
          <RichText text={grade.explanation} />
        </div>
      )}

      {!grade.skipped && (
        <div className="grade-points-wrap">
          <PointList title="What you nailed" items={grade.coveredPoints} tone="good" />
          <PointList title="What you missed" items={grade.missedPoints} tone="mid" />
          <PointList title="Not quite right" items={grade.incorrectClaims} tone="bad" />
        </div>
      )}

      <section className={`grade-reference${referenceOpen ? ' open' : ''}`}>
        <button type="button" className="grade-reference-toggle" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((v) => !v)}>
          <AppIcon name="sparkle" size={15} />
          <span>Best answer</span>
          <span className="grade-reference-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        {referenceOpen && (
          <div className="grade-reference-body">
            <RichText text={grade.referenceAnswer} />
          </div>
        )}
      </section>
    </article>
  );
}
