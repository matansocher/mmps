import { useId, useState } from 'react';
import { estimateSavings, estimator, illustrativeNote } from '../content/index.ts';
import { useLang } from '../lib/i18n.tsx';

type Props = { readonly className?: string; readonly headingLevel?: 'h2' | 'h3' };

// Markup only: each concept styles the `.se-*` classes in its own vocabulary.
export function SavingsEstimator({ className = '', headingLevel: Heading = 'h3' }: Props) {
  const { t, lang } = useLang();
  const id = useId();
  const [claimsPerYear, setClaims] = useState(120000);
  const [avgClaim, setAvg] = useState(lang === 'he' ? 3500 : 1800);
  const [fraudRate, setFraud] = useState(0.1);
  const [catchRate, setCatch] = useState(0.3);
  const { leakage, saved } = estimateSavings({ claimsPerYear, avgClaim, fraudRate, catchRate });
  const cur = t(estimator.currency);
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US', { notation: n >= 1e6 ? 'compact' : 'standard', maximumFractionDigits: n >= 1e6 ? 1 : 0 }).format(n);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const fields = [
    { key: 'claims', label: estimator.claimsPerYear, value: claimsPerYear, set: setClaims, min: 5000, max: 1000000, step: 5000, show: fmt(claimsPerYear) },
    { key: 'avg', label: estimator.avgClaim, value: avgClaim, set: setAvg, min: 200, max: 20000, step: 100, show: `${cur}${fmt(avgClaim)}` },
    { key: 'fraud', label: estimator.fraudRate, hint: estimator.fraudRateHint, value: fraudRate, set: setFraud, min: 0.02, max: 0.2, step: 0.01, show: pct(fraudRate) },
    { key: 'catch', label: estimator.catchRate, hint: estimator.catchRateHint, value: catchRate, set: setCatch, min: 0.05, max: 0.6, step: 0.05, show: pct(catchRate) },
  ];

  return (
    <section className={`se ${className}`.trim()} aria-labelledby={`${id}-t`}>
      <Heading id={`${id}-t`} className="se-title">
        {t(estimator.title)}
      </Heading>
      <div className="se-fields">
        {fields.map((f) => (
          <div className="se-field" key={f.key}>
            <div className="se-field__top">
              <label htmlFor={`${id}-${f.key}`}>{t(f.label)}</label>
              <output htmlFor={`${id}-${f.key}`} className="se-field__value">
                {f.show}
              </output>
            </div>
            <input id={`${id}-${f.key}`} type="range" min={f.min} max={f.max} step={f.step} value={f.value} onChange={(e) => f.set(Number(e.target.value))} />
            {f.hint && <span className="se-field__hint">{t(f.hint)}</span>}
          </div>
        ))}
      </div>
      <dl className="se-results" aria-live="polite">
        <div className="se-result se-result--leak">
          <dt>{t(estimator.leakage)}</dt>
          <dd>
            {cur}
            {fmt(leakage)}
          </dd>
        </div>
        <div className="se-result se-result--saved">
          <dt>{t(estimator.saved)}</dt>
          <dd>
            {cur}
            {fmt(saved)}
          </dd>
        </div>
      </dl>
      <p className="se-note">{t(illustrativeNote)}</p>
    </section>
  );
}
