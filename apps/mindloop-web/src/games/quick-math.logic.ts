import { randInt, shuffle } from '../lib/utils';

type Op = '+' | '−' | '×' | '÷';

export type MathProblem = {
  readonly text: string;
  readonly answer: number;
  readonly options: readonly number[];
  readonly reward: number;
};

export function nextMathLevel(level: number, nextStreak: number, correct: boolean): number {
  return correct ? level + (nextStreak % 2 === 0 ? 1 : 0) : Math.max(0, level - 1);
}

export function makeMathProblem(level: number): MathProblem {
  const ops: Op[] = ['+', '−'];
  if (level >= 2) ops.push('×');
  if (level >= 4) ops.push('÷');
  const op = ops[randInt(0, ops.length - 1)];
  const mag = Math.min(99, 5 + level * 3);
  let a: number;
  let b: number;
  let answer: number;
  switch (op) {
    case '+':
      a = randInt(2, mag);
      b = randInt(2, mag);
      answer = a + b;
      break;
    case '−':
      a = randInt(2, mag);
      b = randInt(1, a);
      answer = a - b;
      break;
    case '×':
      a = randInt(2, Math.min(12, 3 + level));
      b = randInt(2, Math.min(12, 3 + level));
      answer = a * b;
      break;
    case '÷':
      b = randInt(2, Math.min(12, 3 + level));
      answer = randInt(2, Math.min(12, 3 + level));
      a = b * answer;
      break;
  }

  let text = `${a} ${op} ${b}`;
  if (level >= 8) {
    const extra = randInt(2, Math.min(25, 4 + level));
    if (level >= 12 && op === '+') {
      const factor = randInt(2, Math.min(9, level - 9));
      text = `(${a} + ${b}) × ${factor}`;
      answer *= factor;
    } else {
      text += ` + ${extra}`;
      answer += extra;
    }
  }
  const radius = Math.max(3, Math.min(20, Math.floor(answer / 2)));
  const distractors = Array.from({ length: radius * 2 + 1 }, (_, i) => answer - radius + i).filter((value) => value >= 0 && value !== answer);
  return {
    text,
    answer,
    options: shuffle([answer, ...shuffle(distractors).slice(0, 3)]),
    reward: 10 + level * 5,
  };
}
