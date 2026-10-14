import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { syntheticNote } from '../../content/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { ClaimDrawer } from './ClaimDrawer.tsx';
import {
  DECISION_LABEL,
  INITIAL_TALLY,
  LINES,
  TIER_LABEL,
  addToTally,
  initialRows,
  insertRow,
  makeIncoming,
  money,
  sortRows,
  tierOf,
  type Decision,
  type QueueClaim,
} from './data.ts';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ARRIVE_EVERY_MS = 2500;
const SCORE_AFTER_MS = 900;
const SORT_AFTER_MS = 1600;

const copy = {
  app: bi('Claims triage', 'מיון תביעות'),
  live: bi('Live', 'חי'),
  paused: bi('Paused while you look', 'מושהה בזמן שאתם מסתכלים'),
  still: bi('Sorted by risk', 'ממוין לפי סיכון'),
  fast: bi('Fast-tracked today', 'במסלול מהיר היום'),
  held: bi('Held for review', 'מעוכבות לבדיקה'),
  amount: bi('Amount held', 'סכום מעוכב'),
  queue: bi('Incoming claims', 'תביעות נכנסות'),
  queueHint: bi('Click any claim to open it', 'לחצו על תביעה כדי לפתוח אותה'),
  move: bi('move', 'מעבר'),
  open: bi('open', 'פתיחה'),
  scoring: bi('Scoring…', 'מחשב ציון…'),
  riskScore: bi('Risk score', 'ציון סיכון'),
  cols: [bi('Claim', 'תביעה'), bi('Customer', 'לקוח'), bi('Document', 'מסמך'), bi('Amount', 'סכום'), bi('Fraud risk', 'סיכון להונאה'), bi('Recommended', 'המלצה')],
  side: [bi('Queue', 'תור'), bi('Investigations', 'חקירות'), bi('Fast-track', 'מסלול מהיר'), bi('Reports', 'דוחות'), bi('Rules', 'כללים')],
  workspace: bi('Claims ops', 'תפעול תביעות'),
};

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Score({ score, scored, reduced }: { readonly score: number; readonly scored: boolean; readonly reduced: boolean }) {
  const [shown, setShown] = useState(scored ? score : 0);
  useEffect(() => {
    if (!scored) return setShown(0);
    if (reduced) return setShown(score);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scored, score, reduced]);
  return <span className="cs-mono cs-score">{scored ? shown : '··'}</span>;
}

const SIDE_ICONS = [
  'M3 5h14M3 10h14M3 15h9',
  'M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 12l4.5 4.5',
  'M4 10h9M10 5l5 5-5 5',
  'M4 16V9M10 16V4M16 16v-5',
  'M4 6h12M7 10h6M9 14h2',
];

export function Console() {
  const { t, lang } = useLang();
  const [rows, setRows] = useState<QueueClaim[]>(initialRows);
  const [tally, setTally] = useState(INITIAL_TALLY);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [open, setOpen] = useState<QueueClaim | null>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [offscreen, setOffscreen] = useState(false);
  const [reduced] = useState(prefersReduced);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const seq = useRef(0);
  const pending = useRef<QueueClaim | null>(null);

  const paused = reduced || hovering || focused || hidden || offscreen || open !== null;

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    const el = rootRef.current;
    const io = el ? new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting), { threshold: 0.05 }) : null;
    if (el && io) io.observe(el);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      io?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const score = (c: QueueClaim) => {
      pending.current = null;
      setRows((r) => r.map((x) => (x.uid === c.uid ? { ...x, scored: true } : x)));
      setTally((tl) => addToTally(tl, c));
    };
    const cycle = () => {
      const c = makeIncoming(seq.current++);
      pending.current = c;
      setRows((r) => insertRow(r, c));
      later(SCORE_AFTER_MS, () => score(c));
      later(SORT_AFTER_MS, () => setRows(sortRows));
      later(ARRIVE_EVERY_MS, cycle);
    };
    const waiting = pending.current;
    if (waiting) later(300, () => score(waiting));
    later(waiting ? 1000 : 300, () => setRows(sortRows));
    later(waiting ? ARRIVE_EVERY_MS : 1400, cycle);
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [paused]);

  // FLIP: measure each row against its previous offset inside the list, then animate the difference away.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const next = new Map<string, number>();
    const first = positions.current.size === 0;
    list.querySelectorAll<HTMLElement>('[data-uid]').forEach((el) => {
      const uid = el.dataset.uid as string;
      const top = el.offsetTop;
      next.set(uid, top);
      if (reduced || first) return;
      const prev = positions.current.get(uid);
      if (prev === undefined) {
        el.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE });
      } else if (prev !== top) {
        el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: 'none' }], { duration: 680, easing: EASE });
      }
    });
    positions.current = next;
  }, [rows, reduced]);

  const onListKey = (e: KeyboardEvent<HTMLOListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const closeDrawer = () => {
    const uid = open?.uid;
    setOpen(null);
    if (uid) requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-uid="${uid}"] button`)?.focus());
  };

  const status = reduced ? copy.still : paused ? copy.paused : copy.live;

  return (
    <>
      <div
        ref={rootRef}
        className={`cs-app${paused ? ' is-paused' : ''}`}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHovering(false)}
        onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <div className="cs-app__bar">
          <span className="cs-app__crumb">
            <span className="cs-app__ws">{t(copy.workspace)}</span>
            <svg className="cs-flip" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>{t(copy.app)}</strong>
          </span>
          <span className={`cs-live${paused && !reduced ? ' is-paused' : ''}${reduced ? ' is-still' : ''}`}>
            <span className="cs-live__dot" aria-hidden="true" />
            {t(status)}
          </span>
        </div>

        <div className="cs-app__body">
          <aside className="cs-side" aria-hidden="true">
            {copy.side.map((s, i) => (
              <span key={s.en} className={`cs-side__item${i === 0 ? ' is-on' : ''}`}>
                <svg viewBox="0 0 20 20" width="16" height="16">
                  <path d={SIDE_ICONS[i]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t(s)}
                {i === 0 && <span className="cs-side__count cs-mono">{rows.length}</span>}
              </span>
            ))}
          </aside>

          <div className="cs-main">
            <dl className="cs-counters">
              <div>
                <dt>{t(copy.fast)}</dt>
                <dd className="cs-mono">{tally.fastTracked.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>{t(copy.held)}</dt>
                <dd className="cs-mono">{tally.held.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>{t(copy.amount)}</dt>
                <dd className="cs-mono" dir="ltr">
                  {money(tally.amountHeld, lang)}
                </dd>
              </div>
            </dl>

            <div className="cs-qhead">
              <h2 className="cs-qhead__title">{t(copy.queue)}</h2>
              <span className="cs-qhead__hint">{t(copy.queueHint)}</span>
              <span className="cs-keys" aria-hidden="true">
                <kbd>↑</kbd>
                <kbd>↓</kbd> {t(copy.move)} <kbd>↵</kbd> {t(copy.open)}
              </span>
            </div>

            <div className="cs-cols" aria-hidden="true">
              {copy.cols.map((c) => (
                <span key={c.en}>{t(c)}</span>
              ))}
            </div>

            <ol className="cs-q" ref={listRef} onKeyDown={onListKey}>
              {rows.map((r) => {
                const tier = tierOf(r.score);
                const decision = decisions[r.uid];
                return (
                  <li key={r.uid} data-uid={r.uid} className={`cs-row cs-row--${r.scored ? tier : 'scoring'}`}>
                    <button type="button" className="cs-row__btn" onClick={() => setOpen(r)}>
                      <span className="cs-c-id cs-mono">{r.id}</span>
                      <span className="cs-c-who">
                        <span className="cs-avatar" aria-hidden="true">
                          {t(r.initial).charAt(0)}
                        </span>
                        <span className="cs-c-name">{t(r.initial)}</span>
                        <span className="cs-c-line">{t(LINES[r.line])}</span>
                      </span>
                      <span className="cs-c-doc">{t(r.doc)}</span>
                      <span className="cs-c-amt cs-mono" dir="ltr">
                        {money(r.amount, lang)}
                      </span>
                      <span className="cs-c-risk">
                        <span className="cs-bar" aria-hidden="true">
                          <span style={{ inlineSize: `${r.scored ? r.score : 0}%` }} />
                        </span>
                        <span className="sr-only">{t(copy.riskScore)} </span>
                        <Score score={r.score} scored={r.scored} reduced={reduced} />
                      </span>
                      <span className="cs-c-act">
                        <span className={`cs-pill cs-pill--${decision ? 'decided' : r.scored ? tier : 'scoring'}`}>
                          {decision ? t(DECISION_LABEL[decision]) : r.scored ? t(TIER_LABEL[tier]) : t(copy.scoring)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p className="cs-app__foot">{t(syntheticNote)}</p>
          </div>
        </div>
      </div>

      {open && (
        <ClaimDrawer
          key={open.uid}
          claim={open}
          decision={decisions[open.uid]}
          onClose={closeDrawer}
          onDecide={(d) => setDecisions((m) => ({ ...m, [open.uid]: d }))}
        />
      )}
    </>
  );
}
