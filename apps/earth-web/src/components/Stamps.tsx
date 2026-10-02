import { useCallback, useState } from 'react';
import { playMiss, playStamp } from '../store/sound';

const STAMP_MS = 1500;

type StampMark = {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly ok: boolean;
  readonly label: string;
  readonly tilt: number;
};

let nextId = 1;

export function useStamps() {
  const [stamps, setStamps] = useState<readonly StampMark[]>([]);
  const stamp = useCallback((x: number, y: number, ok: boolean, label: string) => {
    const mark = { id: nextId++, x, y, ok, label, tilt: -14 + Math.random() * 10 };
    if (ok) playStamp();
    else playMiss();
    setStamps((all) => [...all.slice(-3), mark]);
    window.setTimeout(() => setStamps((all) => all.filter((s) => s.id !== mark.id)), STAMP_MS);
  }, []);
  return { stamps, stamp };
}

const today = () => new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase();

// Passport-style ink stamps that land where the player clicked.
export function Stamps({ stamps }: { readonly stamps: readonly StampMark[] }) {
  return (
    <>
      {stamps.map(({ id, x, y, ok, label, tilt }) => (
        <div key={id} className="stamp" style={{ left: x, top: y }} aria-hidden="true">
          <div
            className={`board-type flex flex-col items-center rounded-[10px] border-[3px] px-3 py-1.5 text-center leading-none ${ok ? 'border-[#1f8a57] bg-[#e9f7ee]/85 text-[#1f7a4d]' : 'border-[#c8321f] bg-[#fdecea]/85 text-[#b82c1a]'}`}
            style={{ rotate: `${tilt}deg`, boxShadow: 'inset 0 0 0 2px currentColor' }}
          >
            <span className="text-[11px] font-semibold tracking-[0.18em]">{ok ? 'Admitted' : 'Gate change'}</span>
            <span className="max-w-[180px] truncate text-[22px] font-bold">{label}</span>
            <span className="text-[10px] font-semibold tracking-[0.14em]">{ok ? today() : 'Not this one'}</span>
          </div>
        </div>
      ))}
    </>
  );
}
