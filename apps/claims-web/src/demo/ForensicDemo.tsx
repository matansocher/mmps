import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { demoLabels, findings, receipt, syntheticNote, verdicts, type FindingStatus, type ReceiptField, type Scenario } from '../content/index.ts';
import { useLang } from '../lib/i18n.tsx';
import './forensic-demo.css';

// Timeline (ms from start). Step numbers: 0 idle, 1 intake, 2 scan, 3 extract, 4..4+n-1 findings, 4+n verdict.
const INTAKE_MS = 500;
const SCAN_MS = 1700;
const EXTRACT_MS = 1100;
const FINDING_MS = 850;

type Props = {
  readonly className?: string;
  readonly scenario?: Scenario;
  readonly onScenarioChange?: (s: Scenario) => void;
  readonly showScenarioToggle?: boolean;
  readonly autoPlay?: boolean;
  readonly style?: CSSProperties;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const STATUS_ICON: Record<FindingStatus, string> = { pass: '✓', warn: '!', fail: '×' };

export function ForensicDemo({ className = '', scenario: controlled, onScenarioChange, showScenarioToggle = true, autoPlay = true, style }: Props) {
  const { t, lang } = useLang();
  const [internal, setInternal] = useState<Scenario>('altered');
  const scenario = controlled ?? internal;
  const list = findings[scenario];
  const verdict = verdicts[scenario];
  const finalStep = 4 + list.length;

  const [step, setStep] = useState(0);
  const [runId, setRunId] = useState(0);
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState<ReceiptField | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const play = () => {
    started.current = true;
    setRunId((n) => n + 1);
  };

  const setScenario = (s: Scenario) => {
    started.current = true;
    if (onScenarioChange) onScenarioChange(s);
    else setInternal(s);
  };

  // Restart whenever scenario changes after the first run.
  useEffect(() => {
    if (started.current) setRunId((n) => n + 1);
  }, [scenario]);

  useEffect(() => {
    if (!autoPlay) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  useEffect(() => {
    if (runId === 0) return;
    if (prefersReducedMotion()) {
      setStep(finalStep);
      return;
    }
    setStep(1);
    const marks = [INTAKE_MS, INTAKE_MS + SCAN_MS, INTAKE_MS + SCAN_MS + EXTRACT_MS];
    for (let i = 0; i <= list.length; i++) marks.push(marks[2] + (i + 1) * FINDING_MS);
    const timers = marks.map((ms, i) => window.setTimeout(() => setStep(i + 2), ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [runId, finalStep, list.length]);

  const isDone = step >= finalStep;

  useEffect(() => {
    if (!isDone) {
      setScore(0);
      return;
    }
    if (prefersReducedMotion()) {
      setScore(verdict.score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setScore(Math.round(verdict.score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isDone, verdict.score]);

  const revealed = Math.max(0, Math.min(list.length, step - 3));
  const statusFor = (field: ReceiptField): FindingStatus | null => {
    const idx = list.findIndex((f) => f.field === field);
    return idx >= 0 && idx < revealed ? list[idx].status : null;
  };

  const fieldClass = (field: ReceiptField) => {
    const status = statusFor(field);
    return ['fd-f', step >= 3 ? 'is-boxed' : '', status ? `is-${status}` : '', hovered === field ? 'is-hover' : ''].filter(Boolean).join(' ');
  };

  const tag = (field: ReceiptField) => {
    const status = statusFor(field);
    if (!status) return null;
    return (
      <span className={`fd-tag fd-tag--${status}`} aria-hidden="true">
        {STATUS_ICON[status]}
      </span>
    );
  };

  const phaseText = step === 0 ? '' : step <= 2 ? t(demoLabels.scanning) : !isDone ? `${t(demoLabels.checking)} · ${revealed}/${list.length}` : t(verdict.label);
  const altered = scenario === 'altered';
  const amount = altered ? receipt.amountAltered : receipt.amountGenuine;
  const date = altered ? receipt.date : receipt.dateGenuine;
  const level = verdict.score >= 60 ? 'high' : verdict.score >= 30 ? 'mid' : 'low';

  return (
    <div
      ref={rootRef}
      className={`fd fd--${scenario} ${className}`.trim()}
      data-step={step}
      data-done={isDone || undefined}
      style={style}
      role="group"
      aria-label={lang === 'he' ? 'הדגמת ניתוח קבלה' : 'Receipt analysis demo'}
    >
      <div className="fd-in">
      <div className="fd-stage">
        <div className={`fd-paper${step >= 1 ? ' is-in' : ''}`}>
          <div className="fd-receipt" lang={lang}>
            <div className={fieldClass('clinic')}>
              <div className="fd-r-clinic">{t(receipt.clinic)}</div>
              <div className="fd-r-small">{t(receipt.address)}</div>
              {tag('clinic')}
            </div>
            <div className="fd-r-titlerow">
              <span>{t(receipt.title)}</span>
              <span className="fd-r-num">{t(receipt.number)}</span>
            </div>
            <dl className="fd-r-rows">
              <div>
                <dt>{t(receipt.patientLabel)}</dt>
                <dd>{t(receipt.patient)}</dd>
              </div>
              <div className={fieldClass('doctor')}>
                <dt>{t(receipt.doctorLabel)}</dt>
                <dd>{t(receipt.doctor)}</dd>
              </div>
              <div className={fieldClass('license')}>
                <dt>{t(receipt.licenseLabel)}</dt>
                <dd className="fd-r-mono">{receipt.license}</dd>
                {tag('license')}
              </div>
              <div className={fieldClass('date')}>
                <dt>{t(receipt.dateLabel)}</dt>
                <dd>{t(date)}</dd>
                {tag('date')}
              </div>
            </dl>
            <div className={`fd-r-line ${fieldClass('service')}`}>
              <span>{t(receipt.service)}</span>
              {tag('service')}
            </div>
            <div className={`fd-r-total ${fieldClass('amount')}`}>
              <span>{t(receipt.totalLabel)}</span>
              <strong className="fd-r-amount" dir="ltr">
                {altered ? (
                  <>
                    {t(amount).replace(/1,450\.00/, '')}
                    <span className="fd-forged">1,</span>
                    450.00
                  </>
                ) : (
                  t(amount)
                )}
              </strong>
              {tag('amount')}
            </div>
            <div className="fd-r-foot">
              <div className={`fd-stampwrap ${fieldClass('stamp')}`}>
                <span className="fd-stamp" aria-hidden="true">
                  <span>{t(receipt.stamp)}</span>
                  <span className="fd-r-mono">{receipt.license}</span>
                </span>
                {tag('stamp')}
              </div>
              <svg className="fd-sign" viewBox="0 0 120 40" aria-hidden="true">
                <path d="M4 28c10-16 18-22 22-14s-6 16 2 12 12-20 18-14-2 14 6 10 10-12 16-8 4 8 12 4 14-10 24-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className={`fd-beam${step === 2 ? ' is-on' : ''}`} key={`beam-${runId}`} aria-hidden="true" />
        </div>
      </div>

      <div className="fd-panel">
        <div className="fd-claim">
          <span className="fd-claim__id">
            {t(demoLabels.claim)} <span className="fd-r-mono">{receipt.claimId}</span>
          </span>
          <span className="fd-claim__what">{t(receipt.claimLabel)}</span>
          <span className="fd-claim__amt" dir="ltr">
            {t(amount)}
          </span>
          <span className="fd-claim__src">{t(demoLabels.upload)}</span>
        </div>

        <div className="fd-phase" aria-hidden="true">
          <span className={`fd-dot${step > 0 && !isDone ? ' is-busy' : ''}`} />
          <span>{phaseText || '\u00a0'}</span>
        </div>

        <ol className="fd-findings">
          {list.map((f, i) => (
            <li
              key={`${scenario}-${f.field}`}
              className={`fd-finding fd-finding--${f.status}${i < revealed ? ' is-in' : ''}`}
              onMouseEnter={() => setHovered(f.field)}
              onMouseLeave={() => setHovered(null)}
              aria-hidden={i < revealed ? undefined : true}
            >
              <span className="fd-finding__icon" aria-hidden="true">
                {STATUS_ICON[f.status]}
              </span>
              <span className="fd-finding__body">
                <span className="fd-finding__check">
                  {t(f.check)} <span className="sr-only">· {t(demoLabels[f.status])}</span>
                </span>
                <span className="fd-finding__detail">{t(f.detail)}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className={`fd-verdict fd-verdict--${level}${isDone ? ' is-in' : ''}`} aria-live="polite">
          <div className="fd-verdict__top">
            <span>{t(demoLabels.risk)}</span>
            <span className="fd-verdict__score">
              {score}
              <small>/100</small>
            </span>
          </div>
          <div className="fd-meter" aria-hidden="true">
            <span style={{ inlineSize: `${score}%` }} />
          </div>
          {isDone && <p className="fd-verdict__action">{t(verdict.action)}</p>}
        </div>

        <div className="fd-controls">
          {showScenarioToggle && (
            <div className="fd-seg" role="group" aria-label={t(demoLabels.scenario)}>
              {(['altered', 'genuine'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={scenario === s} onClick={() => (scenario === s ? play() : setScenario(s))}>
                  {t(demoLabels[s])}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="fd-replay" onClick={play}>
            <span aria-hidden="true">↻</span> {runId === 0 ? t(demoLabels.play) : t(demoLabels.replay)}
          </button>
        </div>
        <p className="fd-note">{t(syntheticNote)}</p>
      </div>
      </div>
    </div>
  );
}
