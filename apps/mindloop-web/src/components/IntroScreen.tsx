import { useState } from 'react';
import type { Category, GameMeta } from '../lib/types';
import { GameArt } from './GameArt';
import { Icon } from './Icon';
import { RailLesson } from './RailLesson';

const LESSONS: Record<string, readonly { readonly question: string; readonly options: readonly string[]; readonly answer: number; readonly explanation: string }[]> = {
  'grid-recall': [
    {
      question: 'Remember these tiles: top left and bottom right. Which pair is that?',
      options: ['↖ + ↘', '↗ + ↙'],
      answer: 0,
      explanation: 'Exactly. Watch the pattern, then tap the remembered tiles.',
    },
  ],
  'sequence-echo': [{ question: 'The pads flashed 1 → 3 → 2. Which order repeats it?', options: ['1 → 2 → 3', '1 → 3 → 2'], answer: 1, explanation: 'You’ve got it. Each round adds one more pad.' }],
  'sequence-track': [
    {
      question: 'One dot is marked, then the dots move. What do you track?',
      options: ['The marked dot', 'The original spot'],
      answer: 0,
      explanation: 'Follow the dot itself. Choose it after everything stops.',
    },
  ],
  'pair-match': [
    {
      question: 'You saw a star under card 2. Now card 5 shows a star. What next?',
      options: ['Flip card 2', 'Try a new card'],
      answer: 0,
      explanation: 'A pair! Remember each symbol’s location as you go.',
    },
  ],
  'odd-one-out': [{ question: 'Find the different shape: ○ ○ ◇ ○', options: ['The third one', 'The first one'], answer: 0, explanation: 'Right. Choose shade or shape puzzles in Settings.' }],
  'quick-math': [{ question: 'A quick warm-up: 3 + 5 = ?', options: ['8', '6', '9'], answer: 0, explanation: 'Correct. A streak unlocks more interesting problems.' }],
  raindrops: [{ question: 'A drop says 7 − 2. Which answer clears it?', options: ['5', '9'], answer: 0, explanation: 'Type 5, then Solve. Clear the lowest drop first.' }],
  'color-clash': [{ question: 'The word RED is printed in blue ink. What do you choose?', options: ['Red', 'Blue'], answer: 1, explanation: 'Blue—the ink wins. Ignore what the word says.' }],
  'flash-match': [
    { question: 'Previous: blue square. Now: blue square. Match?', options: ['Yes', 'No'], answer: 0, explanation: 'Yes. Both shape and color match.' },
    { question: 'Previous: blue square. Now: red square. Match?', options: ['Yes', 'No'], answer: 1, explanation: 'No. The shape matches but the color changed.' },
  ],
  'ebb-flow': [
    { question: 'GREEN: an arrow points ↑ while moving →. Your answer?', options: ['↑', '→'], answer: 0, explanation: 'Green means POINTS. Follow the arrowhead.' },
    { question: 'ORANGE: an arrow points ↑ while moving →. Your answer?', options: ['↑', '→'], answer: 1, explanation: 'Orange means MOVES. Follow its travel direction.' },
  ],
  'block-escape': [
    {
      question: 'A tall block is in your friend’s way. How can it move?',
      options: ['Up or down', 'Left or right'],
      answer: 0,
      explanation: 'Blocks slide along their length. Clear a path to the right-hand exit.',
    },
  ],
  'order-up': [
    { question: 'Ada ordered apple, then mint. Which tray is right?', options: ['Apple → Mint', 'Mint → Apple'], answer: 0, explanation: 'The order matters. Build the tray, then serve it.' },
  ],
  'shape-shift': [{ question: 'A matching shape can be…', options: ['Rotated', 'Mirrored'], answer: 0, explanation: 'Turn it in your mind. A mirror image is a different shape.' }],
  'rail-router': [
    {
      question: 'Train 2 is yellow. Where should it go?',
      options: ['Yellow station 2', 'Any free station'],
      answer: 0,
      explanation: 'Tap the green junction to change the route. Match number and color.',
    },
  ],
};
export function IntroScreen({
  game,
  category,
  best,
  onStart,
  onPractice,
}: {
  readonly game: GameMeta;
  readonly category: Category;
  readonly best: number;
  readonly onStart: () => void;
  readonly onPractice?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const lessons = LESSONS[game.id] ?? [];
  const lesson = lessons[step];
  const correct = answer === lesson?.answer;
  return (
    <div className="ml-intro">
      <div className="ml-intro-title">
        <div style={{ background: category.soft }} className="ml-small-art">
          <GameArt gameId={game.id} category={game.category} fallback={game.icon} title="" className="h-12 w-12" />
        </div>
        <div>
          <p className="ml-eyebrow">{category.label}</p>
          <h1>{game.title}</h1>
          <p>{game.tagline}</p>
        </div>
      </div>
      <div className="ml-lesson">
        <span className="ml-eyebrow">TRY THE IDEA · NO PRESSURE</span>
        <h2>{lesson?.question}</h2>
        <div className="ml-lesson-options">
          {lesson?.options.map((option, i) => (
            <button key={i} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={answer === i ? (correct ? 'correct' : 'incorrect') : ''}>
              {option}
            </button>
          ))}
        </div>
        <p role="status">{answer === null ? 'A quick example before you play.' : correct ? lesson.explanation : 'Almost. Give the other answer a try.'}</p>
        {correct && step < lessons.length - 1 && (
          <button
            className="ml-text-button"
            onClick={() => {
              setStep(step + 1);
              setAnswer(null);
            }}
          >
            Try the next example <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
      {game.id === 'rail-router' && <RailLesson />}
      <details className="ml-instructions">
        <summary>Full instructions & scoring</summary>
        <ol>
          {game.howTo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p>Scores describe this game, not intelligence or everyday cognitive improvement.</p>
      </details>
      {best > 0 && <p className="ml-save-note">Your best in this mode: {best}</p>}
      <div className="ml-intro-actions">
        <button className="ml-primary" onClick={onStart}>
          Let’s play <Icon name="play" size={18} />
        </button>
        {onPractice && (
          <button className="ml-secondary" onClick={onPractice}>
            Try a gentle practice round
          </button>
        )}
      </div>
    </div>
  );
}
