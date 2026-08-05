import { useMemo } from 'react';
import { computeExposure, distanceToTargets } from '../lib/allocationAdvisor';
import { compareGeography } from '../lib/composition';
import { formatIls, formatPercent } from '../lib/format';
import { calculateRebalance } from '../lib/rebalance';
import { GEOGRAPHY_LABELS } from '../types';
import type { Holding, PortfolioSettings } from '../types';
import { ArrowIcon } from './Icons';

type SimulationPreviewProps = {
  readonly currentHoldings: readonly Holding[];
  readonly simulatedHoldings: readonly Holding[];
  readonly settings: PortfolioSettings;
  readonly addedAmountIls: number;
};

function Delta({ before, after, target }: { readonly before: number; readonly after: number; readonly target?: number }) {
  const delta = after - before;
  const sign = delta > 0.005 ? '+' : '';
  let tone = '';
  if (target !== undefined && Math.abs(delta) > 0.005) {
    const distBefore = Math.abs(before - target);
    const distAfter = Math.abs(after - target);
    tone = distAfter < distBefore - 0.005 ? ' is-closer' : distAfter > distBefore + 0.005 ? ' is-further' : '';
  }
  return <span className={`delta${tone}`}>{`${sign}${delta.toFixed(1)}%`}</span>;
}

function SimulationRow({ label, before, after, target }: { readonly label: string; readonly before: number; readonly after: number; readonly target?: number }) {
  const targetSuffix = target !== undefined ? ` (יעד ${formatPercent(target)})` : '';
  return (
    <div className="simulation-row">
      <strong>{label}{targetSuffix}</strong>
      <span>{formatPercent(before)}</span>
      <ArrowIcon />
      <span>{formatPercent(after)}</span>
      <Delta before={before} after={after} target={target} />
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

  const beforeExposure = useMemo(() => computeExposure(currentHoldings), [currentHoldings]);
  const afterExposure = useMemo(() => computeExposure(simulatedHoldings), [simulatedHoldings]);
  const distBefore = useMemo(() => distanceToTargets(beforeExposure, settings, GEOGRAPHY_LABELS), [beforeExposure, settings]);
  const distAfter = useMemo(() => distanceToTargets(afterExposure, settings, GEOGRAPHY_LABELS), [afterExposure, settings]);
  const distDelta = distBefore - distAfter;
  const showDistanceSummary = currentHasValue && simulatedHasValue && Math.abs(addedAmountIls) > 0;

  return (
    <aside className="simulation-preview" aria-live="polite">
      <div className="simulation-total">
        <span>שווי התיק</span>
        <strong>{formatIls(simulatedResult.currentTotalIls)}</strong>
        <small>תוספת של {formatIls(addedAmountIls)}</small>
      </div>

      {showDistanceSummary ? (
        <div className={`simulation-target-summary${distDelta > 0.05 ? ' is-good' : distDelta < -0.05 ? ' is-bad' : ''}`}>
          <span>מרחק מהיעדים:</span>
          <strong>{distBefore.toFixed(1)} → {distAfter.toFixed(1)}</strong>
          {Math.abs(distDelta) > 0.05 ? <small>{distDelta > 0 ? `שיפור ↓${distDelta.toFixed(1)}` : `הרחקה ↑${Math.abs(distDelta).toFixed(1)}`}</small> : null}
        </div>
      ) : null}

      <h4 className="simulation-section-title">חשיפת מטבע</h4>
      <div className="simulation-table">
        <div className="simulation-row simulation-header">
          <strong>מדד</strong>
          <span>לפני</span>
          <span aria-hidden="true" />
          <span>אחרי</span>
          <span>שינוי</span>
        </div>
        <SimulationRow label="מט״ח" before={currentResult.fxProjectedPercent} after={simulatedResult.fxProjectedPercent} target={settings.fxLimitPercent} />
        <SimulationRow label="שקלי" before={currentIlsPercent} after={simulatedIlsPercent} target={100 - settings.fxLimitPercent} />
      </div>

      <h4 className="simulation-section-title">סוג נכס</h4>
      <div className="simulation-table">
        <div className="simulation-row simulation-header">
          <strong>מדד</strong>
          <span>לפני</span>
          <span aria-hidden="true" />
          <span>אחרי</span>
          <span>שינוי</span>
        </div>
        <SimulationRow label="מנייתי" before={currentEquityPercent} after={simulatedEquityPercent} target={100 - settings.solidTargetPercent} />
        <SimulationRow label="סולידי" before={currentResult.solidProjectedPercent} after={simulatedResult.solidProjectedPercent} target={settings.solidTargetPercent} />
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
          geographyRows.map((row) => <SimulationRow key={row.label} label={row.label} before={row.beforePercent} after={row.afterPercent} target={settings.geographyTargets?.[row.label]} />)
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
