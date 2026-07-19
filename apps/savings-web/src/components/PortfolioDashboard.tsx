import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { geographyColor, geographyComposition } from '../lib/composition';
import { formatIls, formatPercent, formatUpdatedAt } from '../lib/format';
import type { RebalanceResult } from '../lib/rebalance';
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

function PortfolioDonut({
  title,
  amount,
  total,
  remainderLabel,
  note,
}: {
  readonly title: string;
  readonly amount: number;
  readonly total: number;
  readonly remainderLabel: string;
  readonly note: string;
}) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (amount / total) * 100)) : 0;
  const remainder = Math.max(0, total - amount);

  return (
    <article className="overview-stat donut-stat is-fx">
      <span>{title}</span>
      <div
        className="portfolio-donut"
        role="img"
        aria-label={`${title}: ${formatIls(amount)}, ${formatPercent(percentage)} מהתיק. ${remainderLabel}: ${formatIls(remainder)}`}
        style={{ '--donut-value': `${percentage * 3.6}deg` } as CSSProperties}
      >
        <div className="portfolio-donut-center">
          <strong>{formatIls(amount)}</strong>
          <small>{formatPercent(percentage)} מהתיק</small>
        </div>
      </div>
      <small>{note}</small>
    </article>
  );
}

type DonutSegment = {
  readonly key: string;
  readonly label: string;
  readonly amountIls: number;
  readonly color: string;
  readonly targetPercent?: number;
};

function buildConicGradient(segments: readonly { readonly percent: number; readonly color: string }[]): string {
  let allocated = 0;
  const stops: string[] = [];
  for (const segment of segments) {
    if (segment.percent <= 0) continue;
    const start = allocated;
    allocated += segment.percent;
    stops.push(`${segment.color} ${start * 3.6}deg ${allocated * 3.6}deg`);
  }
  stops.push(`#dfe7ea ${allocated * 3.6}deg 360deg`);
  return `conic-gradient(${stops.join(', ')})`;
}

function MultiSegmentDonut({ title, segments, total }: { readonly title: string; readonly segments: readonly DonutSegment[]; readonly total: number }) {
  const withPercent = [...segments]
    .filter((segment) => segment.amountIls > 0)
    .sort((first, second) => second.amountIls - first.amountIls)
    .map((segment) => ({ ...segment, percent: total > 0 ? (segment.amountIls / total) * 100 : 0 }));
  const dominant = withPercent[0];

  return (
    <article className="overview-stat donut-stat is-multi">
      <span>{title}</span>
      <div
        className="portfolio-donut"
        role="img"
        aria-label={`${title}: ${withPercent.length > 0 ? withPercent.map((segment) => `${segment.label} ${formatPercent(segment.percent)}`).join(', ') : 'אין נתונים'}`}
        style={{ background: buildConicGradient(withPercent) }}
      >
        <div className="portfolio-donut-center">
          <strong>{dominant ? formatPercent(dominant.percent) : '—'}</strong>
          <small>{dominant ? dominant.label : 'אין נתונים'}</small>
        </div>
      </div>
      <ul className="donut-legend">
        {withPercent.map((segment) => {
          const hasTarget = segment.targetPercent !== undefined;
          const isOffTarget = hasTarget && Math.abs(segment.percent - (segment.targetPercent ?? 0)) > 5;
          return (
            <li className="donut-legend-row" key={segment.key}>
              <span className="donut-legend-dot" style={{ background: segment.color }} />
              <span className="donut-legend-label cell-ellipsis" title={segment.label}>
                {segment.label}
              </span>
              <strong>{formatPercent(segment.percent)}</strong>
              {hasTarget ? <small className={isOffTarget ? 'is-warning' : ''}>יעד {formatPercent(segment.targetPercent ?? 0)}</small> : null}
            </li>
          );
        })}
        {withPercent.length === 0 ? <li className="donut-legend-empty">אין נתונים עדיין</li> : null}
      </ul>
    </article>
  );
}

function CompositionBar({
  title,
  firstLabel,
  firstValue,
  secondLabel,
  targetText,
  warning,
  hasData,
}: {
  readonly title: string;
  readonly firstLabel: string;
  readonly firstValue: number;
  readonly secondLabel: string;
  readonly targetText: string;
  readonly warning: boolean;
  readonly hasData: boolean;
}) {
  const safeFirstValue = Math.min(100, Math.max(0, firstValue));
  const secondValue = hasData ? 100 - safeFirstValue : 0;
  return (
    <article className="composition-card">
      <div className="composition-heading">
        <div>
          <h3>{title}</h3>
          <span className={warning ? 'goal-status is-warning' : 'goal-status is-good'}>{targetText}</span>
        </div>
        <strong>{formatPercent(safeFirstValue)}</strong>
      </div>
      <div className="composition-track" role="img" aria-label={`${firstLabel} ${formatPercent(safeFirstValue)}, ${secondLabel} ${formatPercent(secondValue)}`}>
        <span className="composition-primary" style={{ inlineSize: `${safeFirstValue}%` }} />
        <span className="composition-secondary" style={{ inlineSize: `${secondValue}%` }} />
      </div>
      <div className="composition-legend">
        <span className="legend-primary">
          {firstLabel} <strong>{formatPercent(safeFirstValue)}</strong>
        </span>
        <span className="legend-secondary">
          {secondLabel} <strong>{formatPercent(secondValue)}</strong>
        </span>
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
  const fxOverTarget = result.fxProjectedPercent > portfolio.settings.fxLimitPercent;
  const solidBelowTarget = result.solidProjectedPercent < portfolio.settings.solidTargetPercent;
  const hasPortfolioValue = result.currentTotalIls > 0;
  const fxAmountIls = result.currentTotalIls * (result.fxProjectedPercent / 100);
  const solidAmountIls = result.currentTotalIls * (result.solidProjectedPercent / 100);
  const equityAmountIls = result.currentTotalIls - solidAmountIls;
  const investmentCountText = portfolio.holdings.length === 1 ? 'השקעה אחת' : `${portfolio.holdings.length} השקעות`;
  const geographySegments: DonutSegment[] = geographyComposition(portfolio.holdings).map((slice, index) => ({
    key: slice.label,
    label: slice.label,
    amountIls: slice.amountIls,
    color: geographyColor(index),
    targetPercent: (portfolio.settings.geographyTargets ?? {})[slice.label],
  }));

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
        <PortfolioDonut title="חשיפת מט״ח" amount={fxAmountIls} total={result.currentTotalIls} remainderLabel="שקלי" note={`יעד מרבי: ${formatPercent(portfolio.settings.fxLimitPercent)}`} />
        <MultiSegmentDonut
          title="סוג נכס"
          total={result.currentTotalIls}
          segments={[
            { key: 'solid', label: 'סולידי', amountIls: solidAmountIls, color: '#b17b16', targetPercent: portfolio.settings.solidTargetPercent },
            { key: 'equity', label: 'מנייתי', amountIls: equityAmountIls, color: '#4767a8', targetPercent: 100 - portfolio.settings.solidTargetPercent },
          ]}
        />
        <MultiSegmentDonut title="אזור גיאוגרפי" total={result.currentTotalIls} segments={geographySegments} />
      </section>

      <section className="panel section composition-section" aria-labelledby="composition-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">תמונת מצב</span>
            <h2 id="composition-title">מבנה התיק</h2>
            <p>חלוקת השווי הנוכחי לפי חשיפת מטבע וסוג נכס.</p>
          </div>
          <div className="section-heading-actions">
            <button className="button-with-icon" type="button" onClick={() => setShowTargets(true)}>
              <SettingsIcon />
              יעדי השקעה
            </button>
            <button className="button-with-icon" type="button" onClick={() => setShowDepositAdvisor(true)}>
              <LightbulbIcon />
              יעוץ הפקדה
            </button>
          </div>
        </div>
        <div className="composition-grid">
          <CompositionBar
            title="חשיפת מטבע"
            firstLabel="מט״ח"
            firstValue={result.fxProjectedPercent}
            secondLabel="שקלי"
            targetText={!hasPortfolioValue ? 'אין נתונים' : fxOverTarget ? 'מעל היעד' : 'בתוך היעד'}
            warning={hasPortfolioValue && fxOverTarget}
            hasData={hasPortfolioValue}
          />
          <CompositionBar
            title="סוג נכס"
            firstLabel="סולידי"
            firstValue={result.solidProjectedPercent}
            secondLabel="מנייתי"
            targetText={!hasPortfolioValue ? 'אין נתונים' : solidBelowTarget ? 'מתחת ליעד' : 'היעד הושג'}
            warning={hasPortfolioValue && solidBelowTarget}
            hasData={hasPortfolioValue}
          />
        </div>
      </section>

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
            onHoldingChange(id, changes);
            setEditingHoldingId(null);
          }}
          onDelete={(id) => {
            onDeleteHolding(id);
            setEditingHoldingId(null);
          }}
          onClose={() => setEditingHoldingId(null)}
        />
      ) : null}
      {showTargets ? <InvestmentTargetsModal holdings={portfolio.holdings} settings={portfolio.settings} onApply={onApplyTargets} onClose={() => setShowTargets(false)} /> : null}

      {showDepositAdvisor ? (
        <DepositAdvisorModal
          holdings={portfolio.holdings}
          settings={portfolio.settings}
          onApply={(id, nextAmountIls) => onHoldingChange(id, { currentAmountIls: nextAmountIls })}
          onClose={() => setShowDepositAdvisor(false)}
        />
      ) : null}
    </main>
  );
}
