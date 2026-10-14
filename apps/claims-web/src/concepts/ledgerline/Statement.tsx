import { useId, type CSSProperties } from 'react';
import { estimator, illustrativeNote } from '../../content/index.ts';
import { useLang, type Bi } from '../../lib/i18n.tsx';
import { copy, FN } from './copy.ts';
import { Fn } from './Fn.tsx';
import { count, money, pct, type Model, type ModelTotals } from './model.ts';

type Props = {
  readonly model: Model;
  readonly totals: ModelTotals;
  readonly onChange: (patch: Partial<Model>) => void;
};

type Field = {
  readonly key: keyof Model;
  readonly label: Bi;
  readonly hint?: Bi;
  readonly fn?: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly show: string;
};

export function Statement({ model, totals, onChange }: Props) {
  const { t, lang } = useLang();
  const id = useId();

  const fields: readonly Field[] = [
    { key: 'claimsPerYear', label: estimator.claimsPerYear, min: 5000, max: 1000000, step: 5000, show: count(model.claimsPerYear, lang) },
    { key: 'avgClaim', label: estimator.avgClaim, min: 200, max: 20000, step: 100, show: money(model.avgClaim, lang) },
    { key: 'fraudRate', label: estimator.fraudRate, hint: estimator.fraudRateHint, fn: FN.iii, min: 0.02, max: 0.2, step: 0.01, show: pct(model.fraudRate) },
    { key: 'catchRate', label: estimator.catchRate, hint: estimator.catchRateHint, fn: FN.illustrative, min: 0.05, max: 0.6, step: 0.05, show: pct(model.catchRate) },
  ];

  return (
    <section className="ll-stmt" aria-labelledby={`${id}-title`}>
      <header className="ll-stmt__head">
        <h2 id={`${id}-title`} className="ll-stmt__title">
          {t(copy.statementTitle)}
        </h2>
        <span className="ll-stmt__period">{t(copy.period)}</span>
      </header>

      <div className="ll-stmt__group">
        <h3 className="ll-stmt__sub">{t(copy.assumptions)}</h3>
        {fields.map((f) => (
          <div className={`ll-in${f.key === 'catchRate' ? ' ll-in--assumed' : ''}`} key={f.key}>
            <div className="ll-in__top">
              <label htmlFor={`${id}-${f.key}`}>{t(f.label)}</label>
              <output htmlFor={`${id}-${f.key}`} className="ll-in__value">
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
              onChange={(e) => onChange({ [f.key]: Number(e.target.value) })}
            />
            {f.hint && (
              <p className="ll-in__hint" id={`${id}-${f.key}-hint`}>
                {t(f.hint)}
                {f.fn && <Fn n={f.fn} />}
              </p>
            )}
          </div>
        ))}
      </div>

      <table className="ll-stmt__out">
        <caption className="sr-only">{t(copy.result)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(copy.result)}</th>
            <th scope="col" className="ll-num">
              {t(copy.amountCol)}
            </th>
          </tr>
        </thead>
        <tbody aria-live="polite">
          <tr>
            <th scope="row">
              {t(copy.claimsPaid)}
              <Fn n={FN.method} />
            </th>
            <td className="ll-num">
              <bdi>{money(totals.paid, lang)}</bdi>
            </td>
          </tr>
          <tr className="ll-row--leak">
            <th scope="row">{t(estimator.leakage)}</th>
            <td className="ll-num">
              <bdi>({money(totals.leakage, lang)})</bdi>
            </td>
          </tr>
          <tr className="ll-row--total">
            <th scope="row">{t(estimator.saved)}</th>
            <td className="ll-num">
              <span className="ll-total">
                <bdi>{money(totals.saved, lang)}</bdi>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="ll-stmt__note">
        {t(illustrativeNote)}
        <Fn n={FN.illustrative} />
      </p>
    </section>
  );
}
