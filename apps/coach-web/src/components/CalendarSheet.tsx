import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_FMT = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function todayString(): string {
  const t = new Date();
  return toDateString(t.getFullYear(), t.getMonth(), t.getDate());
}

type DayCell = {
  dateString: string;
  num: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

function buildGrid(year: number, month: number, selected: string): DayCell[] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const start = new Date(year, month, 1 - firstWeekday);
  const today = todayString();
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateString = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({
      dateString,
      num: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: dateString === today,
      isSelected: dateString === selected,
    });
  }
  return cells;
}

type Props = {
  open: boolean;
  selected: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

export function CalendarSheet({ open, selected, onSelect, onClose }: Props) {
  const initial = new Date(selected + 'T00:00:00');
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  useEffect(() => {
    if (open) {
      const d = new Date(selected + 'T00:00:00');
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function navMonth(delta: number) {
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  }

  function pick(dateString: string) {
    onSelect(dateString);
    onClose();
  }

  function goToday() {
    const t = new Date();
    setView({ y: t.getFullYear(), m: t.getMonth() });
    pick(todayString());
  }

  const grid = buildGrid(view.y, view.m, selected);
  const monthLabel = MONTH_FMT.format(new Date(view.y, view.m, 1));

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            role="dialog"
            aria-label="בחר תאריך"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border-subtle rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex justify-center pt-2">
              <div className="w-10 h-1 rounded-full bg-border-subtle" />
            </div>

            <div className="px-4 pt-3 pb-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navMonth(-1)}
                  aria-label="חודש קודם"
                  className="w-9 h-9 grid place-items-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  <Chevron dir="prev" />
                </button>
                <div className="text-text-primary font-semibold">{monthLabel}</div>
                <button
                  onClick={() => navMonth(1)}
                  aria-label="חודש הבא"
                  className="w-9 h-9 grid place-items-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  <Chevron dir="next" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <div key={i} className="text-center text-text-muted text-[11px] font-medium py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {grid.map((cell) => (
                  <button
                    key={cell.dateString}
                    onClick={() => pick(cell.dateString)}
                    className={cellClass(cell)}
                  >
                    {cell.num}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                <button
                  onClick={goToday}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  היום
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  ביטול
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function cellClass(cell: DayCell): string {
  const base = 'h-10 rounded-lg text-sm score-font transition-colors flex items-center justify-center';
  if (cell.isSelected) {
    return `${base} bg-accent-win text-bg-base font-bold`;
  }
  if (cell.isToday) {
    return `${base} text-accent-win ring-1 ring-accent-win/60 hover:bg-bg-elevated`;
  }
  if (cell.isCurrentMonth) {
    return `${base} text-text-primary hover:bg-bg-elevated`;
  }
  return `${base} text-text-muted/60 hover:bg-bg-elevated`;
}

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  // In an RTL layout, "prev month" visually points right and "next" points left.
  const points = dir === 'prev' ? '9 18 15 12 9 6' : '15 18 9 12 15 6';
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points} />
    </svg>
  );
}
