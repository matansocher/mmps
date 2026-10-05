import { useCallback, useState } from 'react';
import { playCorrect, playMiss } from '../store/sound';

const FEEDBACK_MS = 1200;

type FeedbackMark = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly ok: boolean;
  readonly label: string;
};

let nextId = 1;

export function useFeedback() {
  const [marks, setMarks] = useState<readonly FeedbackMark[]>([]);
  const show = useCallback((x: number, y: number, ok: boolean, label: string) => {
    const mark = { id: nextId++, x, y, ok, label };
    if (ok) playCorrect();
    else playMiss();
    setMarks((all) => [...all.slice(-3), mark]);
    window.setTimeout(() => setMarks((all) => all.filter((m) => m.id !== mark.id)), FEEDBACK_MS);
  }, []);
  return { marks, show };
}

// A small ✓/✗ pill where the player clicked.
export function Feedback({ marks }: { readonly marks: readonly FeedbackMark[] }) {
  return (
    <>
      {marks.map(({ id, x, y, ok, label }) => (
        <div key={id} className="feedback" style={{ left: x, top: y }} aria-hidden="true">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-bold text-white shadow-lg ${ok ? 'bg-[#059669]' : 'bg-[#dc2626]'}`}>
            <span>{ok ? '✓' : '✗'}</span>
            <span className="max-w-[200px] truncate">{label}</span>
          </div>
        </div>
      ))}
    </>
  );
}
