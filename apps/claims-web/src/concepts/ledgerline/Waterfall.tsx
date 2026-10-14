import { useEffect, useRef, useState } from 'react';
import { estimator } from '../../content/index.ts';
import { useLang } from '../../lib/i18n.tsx';
import { copy, FN } from './copy.ts';
import { Fn } from './Fn.tsx';
import { money, type ModelTotals } from './model.ts';

const W = 400;
const H = 240;
const TOP = 8;
const BASE = H - 1;
const AVAIL = BASE - TOP;
const COL = W / 4;
const BAR = 54;

type Phase = 'static' | 'armed' | 'grow';

export function Waterfall({ totals }: { readonly totals: ModelTotals }) {
  const { t, lang, dir } = useLang();
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('static');

  // Bars grow once on first scroll into view; if already visible, reduced motion, or no IO, they simply render.
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    setPhase('armed');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setPhase('grow');
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { paid, leakage, saved, remaining } = totals;
  const k = leakage > 0 ? (AVAIL * 0.62) / leakage : 0;
  const y = (v: number) => BASE - v * k;
  const x = (i: number) => (dir === 'rtl' ? 3 - i : i) * COL + (COL - BAR) / 2;
  const breakY = TOP + AVAIL * 0.3;

  const bars = [
    { key: 'paid', cls: 'paid', top: TOP, bottom: BASE, origin: 'bottom' },
    { key: 'fraud', cls: 'fraud', top: y(leakage), bottom: BASE, origin: 'bottom' },
    { key: 'stopped', cls: 'stopped', top: y(leakage), bottom: y(remaining), origin: 'top' },
    { key: 'net', cls: 'net', top: y(saved), bottom: BASE, origin: 'bottom' },
  ];

  const fraudEdge = dir === 'rtl' ? x(1) : x(1) + BAR;
  const stoppedEdge = dir === 'rtl' ? x(2) + BAR : x(2);
  const stillEdgeA = dir === 'rtl' ? x(2) : x(2) + BAR;
  const stillEdgeB = dir === 'rtl' ? x(3) + BAR : x(3);

  const labels = [
    { key: 'paid', name: copy.claimsPaid, value: money(paid, lang) },
    { key: 'fraud', name: copy.barFraud, value: money(leakage, lang) },
    { key: 'stopped', name: copy.barStopped, value: `(${money(saved, lang)})` },
    { key: 'net', name: copy.barNet, value: money(saved, lang) },
  ];

  return (
    <figure ref={ref} className={`ll-wf ll-wf--${phase}`}>
      <svg className="ll-wf__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} className="ll-wf__grid" x1="0" x2={W} y1={TOP + AVAIL * f} y2={TOP + AVAIL * f} vectorEffect="non-scaling-stroke" />
        ))}
        {bars.map((b, i) => (
          <rect
            key={b.key}
            className={`ll-wf__bar ll-wf__bar--${b.cls}`}
            style={{ transformOrigin: b.origin, transitionDelay: `${i * 160}ms` }}
            x={x(i)}
            y={b.top}
            width={BAR}
            height={Math.max(1, b.bottom - b.top)}
          />
        ))}
        <polygon className="ll-wf__break" points={`${x(0) - 2},${breakY + 6} ${x(0) + BAR + 2},${breakY - 2} ${x(0) + BAR + 2},${breakY + 4} ${x(0) - 2},${breakY + 12}`} />
        <line className="ll-wf__link" x1={fraudEdge} x2={stoppedEdge} y1={y(leakage)} y2={y(leakage)} vectorEffect="non-scaling-stroke" />
        <line className="ll-wf__link ll-wf__link--still" x1={stillEdgeA} x2={stillEdgeB} y1={y(remaining)} y2={y(remaining)} vectorEffect="non-scaling-stroke" />
        <line className="ll-wf__base" x1="0" x2={W} y1={BASE} y2={BASE} vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className="ll-wf__labels" role="list">
        {labels.map((l) => (
          <li key={l.key} className={`ll-wf__label ll-wf__label--${l.key}`}>
            <span className="ll-wf__name">{t(l.name)}</span>
            <span className="ll-wf__value">
              <bdi>{l.value}</bdi>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="ll-wf__cap">
        <span>
          {t(copy.stillPaid)}: <bdi className="ll-wf__still">{money(remaining, lang)}</bdi>
        </span>
        <span>
          {t(copy.axisNote)} {t(estimator.catchRateHint)}
          <Fn n={FN.illustrative} />
        </span>
      </figcaption>
    </figure>
  );
}
