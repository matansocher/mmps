import { useCallback, useState } from 'react';
import { haptic } from '../lib/telegram';
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
    haptic(ok ? 'success' : 'error');
    setMarks((all) => [...all.slice(-3), mark]);
    window.setTimeout(() => setMarks((all) => all.filter((m) => m.id !== mark.id)), FEEDBACK_MS);
  }, []);
  return { marks, show };
}

// A ✓/✗ pill lifted above the tap point, with a stem pointing at where the player tapped.
export function Feedback({ marks }: { readonly marks: readonly FeedbackMark[] }) {
  return (
    <>
      {marks.map(({ id, x, y, ok, label }) => {
        const tone = ok ? 'var(--color-ok)' : 'var(--color-bad)';
        return (
          <div key={id} className="feedback" style={{ left: x, top: y }} aria-hidden="true">
            <div className="flex items-center gap-2 rounded-full border-2 bg-[var(--color-ink)] px-3.5 py-1.5 text-[16px] font-bold text-white shadow-[0_10px_24px_rgb(0_0_0/0.55)]" style={{ borderColor: tone }}>
              <span style={{ color: tone }}>{ok ? '✓' : '✗'}</span>
              <span className="max-w-[220px] truncate">{label}</span>
            </div>
            <div className="feedback-stem" style={{ background: tone }} />
            <div className="feedback-dot" style={{ background: tone }} />
          </div>
        );
      })}
    </>
  );
}
