import { useMemo } from 'react';
import { compareGeography } from '../lib/composition';
import { formatIls, formatPercent } from '../lib/format';
import { calculateRebalance } from '../lib/rebalance';
import type { Holding, PortfolioSettings } from '../types';
import { ArrowIcon } from './Icons';

type SimulationPreviewProps = {
  readonly currentHoldings: readonly Holding[];
  readonly simulatedHoldings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly addedAmountIls: number;
};

function Delta({ before, after }: { readonly before: number; readonly after: number }) {
  const delta = after - before;
  const sign = delta > 0.005 ? '+' : '';
  return <span className={delta > 0.005 ? 'delta is-up' : delta < -0.005 ? 'delta is-down' : 'delta'}>{`${sign}${delta.toFixed(1)}%`}</span>;
}

function SimulationRow({ label, before, after }: { readonly label: string; readonly before: number; readonly after: number }) {
  return (
    <div className="simulation-row">
      <strong>{label}</strong>
      <span>{formatPercent(before)}</span>
      <ArrowIcon />
      <span>{formatPercent(after)}</span>
      <Delta before={before} after={after} />
    </div>
  );
}

export function SimulationPreview({ currentHoldings, simulatedHoldings, settings, addedAmountIls }: SimulationPreviewProps) {
  const currentResult = useMemo(() => calculateRebalance(currentHoldings, { ...settings, depositAmountIls: 0 }), [currentHoldings, settings]);
  const simulatedResult = useMemo(() => calculateRebalance(simulatedHoldings, { ...settings, depositAmountIls: 0 }), [simulatedHoldings, settings]);
  const geographyRows = useMemo(() => compareGeography(currentHoldings, simulatedHoldings), [currentHoldings, simulatedHoldings]);

  const currentHasValue = currentResult.currentTotalIls > 0;
  const simulatedHasValue = simulatedResult.currentTotalIls > 0;
  const currentIlsPercent = currentHasValue ? 100 - currentResult.fxProjectedPercent : 0;
  const simulatedIlsPercent = simulatedHasValue ? 100 - simulatedResult.fxProjectedPercent : 0;
  const currentEquityPercent = currentHasValue ? 100 - currentResult.solidProjectedPercent : 0;
  const simulatedEquityPercent = simulatedHasValue ? 100 - simulatedResult.solidProjectedPercent : 0;

  return (
    <aside className="simulation-preview" aria-live="polite">
      <div className="simulation-total">
        <span>שווי התיק</span>
        <strong>{formatIls(simulatedResult.currentTotalIls)}</strong>
        <small>תוספת של {formatIls(addedAmountIls)}</small>
      </div>

      <h4 className="simulation-section-title">מטבע וסוג נכס</h4>
      <div className="simulation-table">
        <div className="simulation-row simulation-header">
          <strong>מדד</strong>
          <span>לפני</span>
          <span aria-hidden="true" />
          <span>אחרי</span>
          <span>שינוי</span>
        </div>
        <SimulationRow label="מט״ח" before={currentResult.fxProjectedPercent} after={simulatedResult.fxProjectedPercent} />
        <SimulationRow label="שקלי" before={currentIlsPercent} after={simulatedIlsPercent} />
        <SimulationRow label="מנייתי" before={currentEquityPercent} after={simulatedEquityPercent} />
        <SimulationRow label="סולידי" before={currentResult.solidProjectedPercent} after={simulatedResult.solidProjectedPercent} />
      </div>

      <h4 className="simulation-section-title">חלוקה לפי אזור</h4>
      <div className="simulation-table">
        <div className="simulation-row simulation-header">
          <strong>אזור</strong>
          <span>לפני</span>
          <span aria-hidden="true" />
          <span>אחרי</span>
          <span>שינוי</span>
        </div>
        {geographyRows.length > 0 ? (
          geographyRows.map((row) => <SimulationRow key={row.label} label={row.label} before={row.beforePercent} after={row.afterPercent} />)
        ) : (
          <div className="simulation-row simulation-empty">
            <span>אין עדיין נתוני אזור להצגה.</span>
          </div>
        )}
      </div>

      <p className="simulation-hint">הסימולציה אינה משנה את הנתונים עד לאישור.</p>
    </aside>
  );
}
