import { useEffect, useState } from 'react';
import { geographyComposition } from '../lib/composition';
import { formatIls, formatPercent, formatUpdatedAt } from '../lib/format';
import type { RebalanceResult } from '../lib/rebalance';
import { GEOGRAPHY_LABELS } from '../types';
import type { Holding, HoldingDraft, Portfolio, PortfolioSettings, SaveStatus } from '../types';
import { DepositAdvisorModal } from './DepositAdvisorModal';
import { EditHoldingModal } from './EditHoldingModal';
import { HoldingsTable } from './HoldingsTable';
import { EditIcon, LightbulbIcon, LogoutIcon, PlusIcon, SaveIcon, SettingsIcon } from './Icons';
import { InvestmentSimulationModal } from './InvestmentSimulationModal';
import { InvestmentTargetsModal } from './InvestmentTargetsModal';

type PortfolioDashboardProps = {
  readonly portfolio: Portfolio;
  readonly result: RebalanceResult;
  readonly status: SaveStatus;
  readonly hasChanges: boolean;
  readonly onHoldingChange: (id: string, changes: Partial<Holding>) => void;
  readonly onModalHoldingChange: (id: string, changes: Partial<Holding>) => void;
  readonly onAddHolding: (holding: HoldingDraft) => void;
  readonly onDeleteHolding: (id: string) => void;
  readonly onApplyTargets: (settings: Pick<PortfolioSettings, 'fxLimitPercent' | 'solidTargetPercent' | 'geographyTargets'>) => void;
  readonly onRevert: () => void;
  readonly onSave: () => void;
  readonly onAcceptLatest: () => void;
  readonly onLogout: () => void;
};

function SaveFeedback({ status, hasChanges, onAcceptLatest }: { readonly status: SaveStatus; readonly hasChanges: boolean; readonly onAcceptLatest: () => void }) {
  if (status === 'saving') return <span className="status status-saving">שומר את השינויים…</span>;
  if (status === 'saved') return <span className="status status-success">השינויים נשמרו בהצלחה.</span>;
  if (status === 'error') return <span className="status status-error">השמירה נכשלה. הנתונים המקומיים נשארו במסך.</span>;
  if (status === 'conflict') {
    return (
      <span className="status status-conflict">
        קיימת גרסה חדשה יותר בשרת.
        <button className="status-action" type="button" onClick={onAcceptLatest}>
          טעינת הנתונים העדכניים
        </button>
      </span>
    );
  }
  return <span className="status">{hasChanges ? 'יש שינויים מקומיים שטרם נשמרו.' : 'הנתונים מסונכרנים עם השרת.'}</span>;
}

function SummaryCard({ title, value, note, tone }: { readonly title: string; readonly value: string; readonly note: string; readonly tone?: 'good' | 'warning' }) {
  return (
    <article className={`overview-stat${tone ? ` is-${tone}` : ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function TargetBarCard({ title, actual, target }: { readonly title: string; readonly actual: number; readonly target: number }) {
  const safeActual = Math.min(100, Math.max(0, actual));
  const safeTarget = Math.min(100, Math.max(0, target));
  const onTarget = Math.abs(safeActual - safeTarget) <= 5;
  const noData = !Number.isFinite(actual) || actual === 0;
  const statusText = noData ? 'אין נתונים' : onTarget ? 'בתוך היעד' : safeActual > safeTarget ? 'מעל היעד' : 'מתחת ליעד';

  return (
    <article className={`overview-stat target-bar-card${!noData && !onTarget ? ' is-warning' : ''}`}>
      <span>{title}</span>
      <div className="target-bar-labels">
        <strong>{formatPercent(safeActual)}</strong>
        <small>יעד {formatPercent(safeTarget)}</small>
      </div>
      <div className="target-bar-track" role="img" aria-label={`${title}: ${formatPercent(safeActual)}, יעד ${formatPercent(safeTarget)}`}>
        <span className={`target-bar-fill${onTarget ? '' : ' is-off'}`} style={{ inlineSize: `${safeActual}%` }} />
        <span className="target-bar-marker" style={{ insetInlineStart: `${safeTarget}%` }} />
      </div>
      <small className={`target-bar-status${noData ? '' : onTarget ? ' is-good' : ' is-warning'}`}>{statusText}</small>
    </article>
  );
}

function GeographyTargetCard({ holdings, targets }: { readonly holdings: readonly Holding[]; readonly targets: Readonly<Record<string, number>> }) {
  const slices = geographyComposition(holdings);
  const sliceMap = new Map(slices.map((slice) => [slice.label, slice.percent]));

  return (
    <article className="overview-stat geography-target-card">
      <span>אזור גיאוגרפי</span>
      <div className="geography-bars">
        {GEOGRAPHY_LABELS.map((label) => {
          const actual = sliceMap.get(label) ?? 0;
          const target = targets[label] ?? 0;
          const onTarget = Math.abs(actual - target) <= 5;
          return (
            <div className="geography-bar-row" key={label}>
              <span className="geography-bar-label">{label}</span>
              <div className="target-bar-track" role="img" aria-label={`${label}: ${formatPercent(actual)}, יעד ${formatPercent(target)}`}>
                <span className={`target-bar-fill${onTarget ? '' : ' is-off'}`} style={{ inlineSize: `${actual}%` }} />
                <span className="target-bar-marker" style={{ insetInlineStart: `${target}%` }} />
              </div>
              <span className="geography-bar-value">{formatPercent(actual)}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function PortfolioDashboard({
  portfolio,
  result,
  status,
  hasChanges,
  onHoldingChange,
  onModalHoldingChange,
  onAddHolding,
  onDeleteHolding,
  onApplyTargets,
  onRevert,
  onSave,
  onAcceptLatest,
  onLogout,
}: PortfolioDashboardProps) {
  const [showSimulation, setShowSimulation] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [showDepositAdvisor, setShowDepositAdvisor] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [isTableEditable, setIsTableEditable] = useState(false);
  const saveDisabled = !hasChanges || status === 'saving' || status === 'conflict';
  const investmentCountText = portfolio.holdings.length === 1 ? 'השקעה אחת' : `${portfolio.holdings.length} השקעות`;

  function cancelChanges(): void {
    onRevert();
    setIsTableEditable(false);
  }

  useEffect(() => {
    if (status === 'saved') setIsTableEditable(false);
  }, [status]);

  const editingHolding = editingHoldingId ? (portfolio.holdings.find((holding) => holding.id === editingHoldingId) ?? null) : null;

  return (
    <main className="shell portfolio-shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark" aria-hidden="true">
            %
          </div>
          <div>
            <h1>תיק ההשקעות המשפחתי</h1>
            <p className="subtitle">כל ההשקעות, החשיפות והיעדים במקום אחד.</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="sync-meta">
            <span>עדכון אחרון</span>
            <strong>{formatUpdatedAt(portfolio.updatedAt)}</strong>
          </div>
          <button className="quiet-button button-with-icon" type="button" onClick={onLogout}>
            <LogoutIcon />
            יציאה
          </button>
        </div>
      </header>

      <section className="overview-stats" aria-label="תקציר תיק ההשקעות">
        <SummaryCard title="שווי התיק" value={formatIls(result.currentTotalIls)} note={investmentCountText} />
        <TargetBarCard title="חשיפת מט״ח" actual={result.fxProjectedPercent} target={portfolio.settings.fxLimitPercent} />
        <TargetBarCard title="סולידי" actual={result.solidProjectedPercent} target={portfolio.settings.solidTargetPercent} />
        <GeographyTargetCard holdings={portfolio.holdings} targets={portfolio.settings.geographyTargets ?? {}} />
      </section>

      <div className="overview-actions">
        <button className="button-with-icon" type="button" onClick={() => setShowTargets(true)}>
          <SettingsIcon />
          יעדי השקעה
        </button>
        <button className="button-with-icon" type="button" onClick={() => setShowDepositAdvisor(true)}>
          <LightbulbIcon />
          יעוץ הפקדה
        </button>
      </div>

      <section className="panel investments-section" aria-labelledby="investments-title">
        <div className="investments-toolbar">
          <div>
            <span className="eyebrow">הנתונים שלכם</span>
            <h2 id="investments-title">כל ההשקעות</h2>
            <p>לחצו על עריכת הטבלה כדי לעדכן שווי נוכחי, או על שורה לעריכה מלאה של פרטי ההשקעה.</p>
          </div>
          <div className="portfolio-actions">
            <button className={isTableEditable ? 'secondary button-with-icon' : 'button-with-icon'} type="button" onClick={() => setIsTableEditable((current) => !current)}>
              <EditIcon />
              {isTableEditable ? 'סיום עריכה' : 'עריכת הטבלה'}
            </button>
            <button className="primary button-with-icon" type="button" onClick={() => setShowSimulation(true)}>
              <PlusIcon />
              הוספת השקעה
            </button>
            {hasChanges ? (
              <>
                <button className="secondary button-with-icon" type="button" onClick={onSave} disabled={saveDisabled}>
                  <SaveIcon />
                  {status === 'saving' ? 'שומרים…' : 'שמירה'}
                </button>
                <button type="button" onClick={cancelChanges} disabled={status === 'saving' || status === 'conflict'}>
                  ביטול
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="investments-save-status" aria-live="polite">
          <SaveFeedback status={status} hasChanges={hasChanges} onAcceptLatest={onAcceptLatest} />
        </div>
        <HoldingsTable
          holdings={portfolio.holdings}
          editable={isTableEditable}
          onAmountChange={(id, nextAmountIls) => onHoldingChange(id, { currentAmountIls: nextAmountIls })}
          onRowClick={(holding) => setEditingHoldingId(holding.id)}
        />
      </section>

      {status === 'conflict' ? (
        <div className="conflict-banner" role="alert">
          <div>
            <strong>השמירה נעצרה כדי למנוע דריסת נתונים.</strong>
            <span>מישהו שמר גרסה חדשה יותר. טענו אותה לפני המשך העריכה.</span>
          </div>
          <button className="button-with-icon" type="button" onClick={onAcceptLatest}>
            <EditIcon />
            טעינת הגרסה האחרונה
          </button>
        </div>
      ) : null}

      {showSimulation ? <InvestmentSimulationModal holdings={portfolio.holdings} settings={portfolio.settings} onAdd={onAddHolding} onClose={() => setShowSimulation(false)} /> : null}
      {editingHolding ? (
        <EditHoldingModal
          holding={editingHolding}
          holdings={portfolio.holdings}
          settings={portfolio.settings}
          onSave={(id, changes) => {
            onModalHoldingChange(id, changes);
            setEditingHoldingId(null);
          }}
          onDelete={(id) => {
            onDeleteHolding(id);
            setEditingHoldingId(null);
          }}
          onClose={() => setEditingHoldingId(null)}
        />
      ) : null}
      {showTargets ? <InvestmentTargetsModal settings={portfolio.settings} onApply={onApplyTargets} onClose={() => setShowTargets(false)} /> : null}

      {showDepositAdvisor ? (
        <DepositAdvisorModal
          holdings={portfolio.holdings}
          settings={portfolio.settings}
          onApply={(id, nextAmountIls) => onModalHoldingChange(id, { currentAmountIls: nextAmountIls })}
          onClose={() => setShowDepositAdvisor(false)}
        />
      ) : null}
    </main>
  );
}
