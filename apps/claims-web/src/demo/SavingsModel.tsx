import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { estimateSavings, estimator, illustrativeNote } from '../content/index.ts';
import { useLang, type Bi, type Lang } from '../lib/i18n.tsx';
import './savings-model.css';

type Model = {
  readonly claimsPerYear: number;
  readonly avgClaim: number;
  readonly fraudRate: number;
  readonly catchRate: number;
};

type Field = {
  readonly key: keyof Model;
  readonly label: Bi;
  readonly hint?: Bi;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly show: string;
};

type Phase = 'static' | 'armed' | 'grow';

const SCALES = [
  { at: 1e9, en: 'B', he: ' מיליארד' },
  { at: 1e6, en: 'M', he: ' מיליון' },
  { at: 1e3, en: 'K', he: ' אלף' },
] as const;

// Format: "$21.6M" / "₪21.6 מיליון"
function money(n: number, lang: Lang): string {
  const cur = lang === 'he' ? '₪' : '$';
  const abs = Math.abs(n);
  const scale = SCALES.find((s) => abs >= s.at);
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  if (!scale) return `${cur}${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(abs)}`;
  const v = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(abs / scale.at);
  return `${cur}${v}${scale[lang]}`;
}

const count = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US').format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

const W = 400;
const H = 240;
const TOP = 8;
const BASE = H - 1;
const AVAIL = BASE - TOP;
const COL = W / 4;
const BAR = 54;

// Markup + structure only: each concept themes it through the --sm-* custom properties.
export function SavingsModel({ className = '' }: { readonly className?: string }) {
  const { t, lang, dir } = useLang();
  const id = useId();
  const chartRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('static');
  const [model, setModel] = useState<Model>(() => ({ claimsPerYear: 120000, avgClaim: lang === 'he' ? 3500 : 1800, fraudRate: 0.1, catchRate: 0.3 }));

  // Bars grow once on first scroll into view; if already visible, reduced motion, or no IO, they simply render.
  useEffect(() => {
    const el = chartRef.current;
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

  const { leakage, saved } = estimateSavings(model);
  const paid = model.claimsPerYear * model.avgClaim;
  const remaining = leakage - saved;

  const fields: readonly Field[] = [
    { key: 'claimsPerYear', label: estimator.claimsPerYear, min: 5000, max: 1000000, step: 5000, show: count(model.claimsPerYear, lang) },
    { key: 'avgClaim', label: estimator.avgClaim, min: 200, max: 20000, step: 100, show: money(model.avgClaim, lang) },
    { key: 'fraudRate', label: estimator.fraudRate, hint: estimator.fraudRateHint, min: 0.02, max: 0.2, step: 0.01, show: pct(model.fraudRate) },
    { key: 'catchRate', label: estimator.catchRate, hint: estimator.catchRateHint, min: 0.05, max: 0.6, step: 0.05, show: pct(model.catchRate) },
  ];

  const k = leakage > 0 ? (AVAIL * 0.62) / leakage : 0;
  const y = (v: number) => BASE - v * k;
  const x = (i: number) => (dir === 'rtl' ? 3 - i : i) * COL + (COL - BAR) / 2;
  const breakY = TOP + AVAIL * 0.3;

  const bars = [
    { key: 'paid', top: TOP, bottom: BASE, origin: 'bottom' },
    { key: 'fraud', top: y(leakage), bottom: BASE, origin: 'bottom' },
    { key: 'stopped', top: y(leakage), bottom: y(remaining), origin: 'top' },
    { key: 'net', top: y(saved), bottom: BASE, origin: 'bottom' },
  ];

  const fraudEdge = dir === 'rtl' ? x(1) : x(1) + BAR;
  const stoppedEdge = dir === 'rtl' ? x(2) + BAR : x(2);
  const stillEdgeA = dir === 'rtl' ? x(2) : x(2) + BAR;
  const stillEdgeB = dir === 'rtl' ? x(3) + BAR : x(3);

  const labels = [
    { key: 'paid', name: estimator.claimsPaid, value: money(paid, lang) },
    { key: 'fraud', name: estimator.barFraud, value: money(leakage, lang) },
    { key: 'stopped', name: estimator.barStopped, value: `(${money(saved, lang)})` },
    { key: 'net', name: estimator.barNet, value: money(saved, lang) },
  ];

  return (
    <div className={`sm ${className}`.trim()}>
      <div className="sm-in">
        <div className="sm-inputs">
          <h3 className="sm-sub">{t(estimator.assumptions)}</h3>
          {fields.map((f) => (
            <div className="sm-field" key={f.key}>
              <div className="sm-field__top">
                <label htmlFor={`${id}-${f.key}`}>{t(f.label)}</label>
                <output htmlFor={`${id}-${f.key}`} className="sm-field__value">
                  <bdi>{f.show}</bdi>
                </output>
              </div>
              <input
                id={`${id}-${f.key}`}
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={model[f.key]}
                style={{ '--p': `${((model[f.key] - f.min) / (f.max - f.min)) * 100}%` } as CSSProperties}
                aria-valuetext={f.show}
                aria-describedby={f.hint ? `${id}-${f.key}-hint` : undefined}
                onChange={(e) => setModel((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
              />
              {f.hint && (
                <p className="sm-field__hint" id={`${id}-${f.key}-hint`}>
                  {t(f.hint)}
                </p>
              )}
            </div>
          ))}
          <dl className="sm-totals" aria-live="polite">
            <div className="sm-total sm-total--leak">
              <dt>{t(estimator.leakage)}</dt>
              <dd>
                <bdi>{money(leakage, lang)}</bdi>
              </dd>
            </div>
            <div className="sm-total sm-total--saved">
              <dt>{t(estimator.saved)}</dt>
              <dd>
                <bdi>{money(saved, lang)}</bdi>
              </dd>
            </div>
          </dl>
        </div>

        <figure ref={chartRef} className={`sm-wf sm-wf--${phase}`} aria-labelledby={`${id}-chart`}>
          <h3 className="sm-sub" id={`${id}-chart`}>
            {t(estimator.chartTitle)}
          </h3>
          <svg className="sm-wf__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} className="sm-wf__grid" x1="0" x2={W} y1={TOP + AVAIL * f} y2={TOP + AVAIL * f} vectorEffect="non-scaling-stroke" />
            ))}
            {bars.map((b, i) => (
              <rect
                key={b.key}
                className={`sm-wf__bar sm-wf__bar--${b.key}`}
                style={{ transformOrigin: b.origin, transitionDelay: `${i * 160}ms` }}
                x={x(i)}
                y={b.top}
                width={BAR}
                height={Math.max(1, b.bottom - b.top)}
              />
            ))}
            <polygon className="sm-wf__break" points={`${x(0) - 2},${breakY + 6} ${x(0) + BAR + 2},${breakY - 2} ${x(0) + BAR + 2},${breakY + 4} ${x(0) - 2},${breakY + 12}`} />
            <line className="sm-wf__link" x1={fraudEdge} x2={stoppedEdge} y1={y(leakage)} y2={y(leakage)} vectorEffect="non-scaling-stroke" />
            <line className="sm-wf__link sm-wf__link--still" x1={stillEdgeA} x2={stillEdgeB} y1={y(remaining)} y2={y(remaining)} vectorEffect="non-scaling-stroke" />
            <line className="sm-wf__base" x1="0" x2={W} y1={BASE} y2={BASE} vectorEffect="non-scaling-stroke" />
          </svg>
          <ul className="sm-wf__labels" role="list">
            {labels.map((l) => (
              <li key={l.key} className={`sm-wf__label sm-wf__label--${l.key}`}>
                <span className="sm-wf__name">{t(l.name)}</span>
                <span className="sm-wf__value">
                  <bdi>{l.value}</bdi>
                </span>
              </li>
            ))}
          </ul>
          <figcaption className="sm-wf__cap">
            <span>
              {t(estimator.stillPaid)}: <bdi className="sm-wf__still">{money(remaining, lang)}</bdi>
            </span>
            <span>{t(estimator.axisNote)}</span>
          </figcaption>
        </figure>
      </div>
      <p className="sm-note">{t(illustrativeNote)}</p>
    </div>
  );
}
