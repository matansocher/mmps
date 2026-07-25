import { dominantKey } from '../lib/breakdown';
import type { BreakdownRecord, HoldingDraft } from '../types';
import { GEOGRAPHY_LABELS } from '../types';
import { BreakdownInput } from './BreakdownInput';
import { FemaleIcon, MaleIcon } from './Icons';
import { Select } from './Select';

type HoldingFormFieldsProps = {
  readonly idPrefix: string;
  readonly draft: HoldingDraft;
  readonly onChange: (changes: Partial<HoldingDraft>) => void;
};

function initCurrencyBreakdown(current: HoldingDraft['currencyExposure']): BreakdownRecord {
  return current === 'fx' ? { fx: 100, ils: 0 } : { ils: 100, fx: 0 };
}

function initAssetBreakdown(current: HoldingDraft['assetType']): BreakdownRecord {
  return current === 'solid' ? { solid: 100, equity: 0 } : { equity: 100, solid: 0 };
}

function initGeographyBreakdown(current: string): BreakdownRecord {
  if (!current.trim()) return Object.fromEntries(GEOGRAPHY_LABELS.map((l, i) => [l, i === 0 ? 100 : 0]));
  const result: Record<string, number> = {};
  for (const label of GEOGRAPHY_LABELS) {
    result[label] = label === current ? 100 : 0;
  }
  return result;
}

export function HoldingFormFields({ idPrefix, draft, onChange }: HoldingFormFieldsProps) {
  const hasCurrencyBreakdown = draft.currencyBreakdown !== undefined;
  const hasAssetBreakdown = draft.assetBreakdown !== undefined;
  const hasGeographyBreakdown = draft.geographyBreakdown !== undefined;

  function toggleCurrency(): void {
    if (hasCurrencyBreakdown) {
      const dominant = dominantKey(draft.currencyBreakdown!);
      onChange({ currencyExposure: dominant === 'fx' ? 'fx' : 'ils', currencyBreakdown: undefined });
    } else {
      onChange({ currencyBreakdown: initCurrencyBreakdown(draft.currencyExposure) });
    }
  }

  function toggleAsset(): void {
    if (hasAssetBreakdown) {
      const dominant = dominantKey(draft.assetBreakdown!);
      onChange({ assetType: dominant === 'solid' ? 'solid' : 'equity', assetBreakdown: undefined });
    } else {
      onChange({ assetBreakdown: initAssetBreakdown(draft.assetType) });
    }
  }

  function toggleGeography(): void {
    if (hasGeographyBreakdown) {
      const dominant = dominantKey(draft.geographyBreakdown!);
      onChange({ geography: dominant || GEOGRAPHY_LABELS[0], geographyBreakdown: undefined });
    } else {
      onChange({ geographyBreakdown: initGeographyBreakdown(draft.geography) });
    }
  }

  return (
    <>
      <label htmlFor={`${idPrefix}-name`}>
        שם ההשקעה
        <input id={`${idPrefix}-name`} name={`${idPrefix}-name`} value={draft.name} onChange={(event) => onChange({ name: event.target.value })} autoComplete="off" required />
      </label>
      <label htmlFor={`${idPrefix}-amount`}>
        שווי נוכחי
        <div className="input-with-unit">
          <input
            id={`${idPrefix}-amount`}
            name={`${idPrefix}-amount`}
            type="number"
            min="0"
            step="100"
            value={draft.currentAmountIls}
            onChange={(event) => onChange({ currentAmountIls: Number.isFinite(event.target.valueAsNumber) ? Math.max(0, event.target.valueAsNumber) : 0 })}
            required
          />
          <span>₪</span>
        </div>
      </label>
      <label htmlFor={`${idPrefix}-account`}>
        חלק בתיק
        <Select
          id={`${idPrefix}-account`}
          name={`${idPrefix}-account`}
          value={draft.account}
          onChange={(nextValue) => onChange({ account: nextValue === 'managed' ? 'managed' : 'manual' })}
          options={[
            { value: 'manual', label: 'תיק ידני' },
            { value: 'managed', label: 'חסכונות מנוהלים' },
          ]}
        />
      </label>
      <label htmlFor={`${idPrefix}-currency`}>
        <span className="field-label-row">
          חשיפת מטבע
          <label className="breakdown-toggle">
            <input type="checkbox" checked={hasCurrencyBreakdown} onChange={toggleCurrency} />
            פיצול
          </label>
        </span>
        {hasCurrencyBreakdown ? (
          <BreakdownInput
            idPrefix={`${idPrefix}-currency`}
            options={[
              { value: 'ils', label: 'שקלי' },
              { value: 'fx', label: 'מט״ח' },
            ]}
            breakdown={draft.currencyBreakdown!}
            onChange={(currencyBreakdown) => onChange({ currencyBreakdown })}
          />
        ) : (
          <Select
            id={`${idPrefix}-currency`}
            name={`${idPrefix}-currency`}
            value={draft.currencyExposure}
            onChange={(nextValue) => onChange({ currencyExposure: nextValue === 'fx' ? 'fx' : 'ils' })}
            options={[
              { value: 'ils', label: 'שקלי' },
              { value: 'fx', label: 'מט״ח' },
            ]}
          />
        )}
      </label>
      <label htmlFor={`${idPrefix}-type`}>
        <span className="field-label-row">
          סוג נכס
          <label className="breakdown-toggle">
            <input type="checkbox" checked={hasAssetBreakdown} onChange={toggleAsset} />
            פיצול
          </label>
        </span>
        {hasAssetBreakdown ? (
          <BreakdownInput
            idPrefix={`${idPrefix}-asset`}
            options={[
              { value: 'equity', label: 'מנייתי' },
              { value: 'solid', label: 'סולידי' },
            ]}
            breakdown={draft.assetBreakdown!}
            onChange={(assetBreakdown) => onChange({ assetBreakdown })}
          />
        ) : (
          <Select
            id={`${idPrefix}-type`}
            name={`${idPrefix}-type`}
            value={draft.assetType}
            onChange={(nextValue) => onChange({ assetType: nextValue === 'solid' ? 'solid' : 'equity' })}
            options={[
              { value: 'equity', label: 'מנייתי' },
              { value: 'solid', label: 'סולידי' },
            ]}
          />
        )}
      </label>
      <label htmlFor={`${idPrefix}-owner`}>
        בעלים
        <Select
          id={`${idPrefix}-owner`}
          name={`${idPrefix}-owner`}
          value={draft.owner}
          onChange={(nextValue) => onChange({ owner: (nextValue === 'guy' || nextValue === 'tody' ? nextValue : 'shared') })}
          options={[
            { value: 'guy', label: <><MaleIcon className="select-owner-icon" /> גוז</> },
            { value: 'tody', label: <><FemaleIcon className="select-owner-icon" /> תודי</> },
            { value: 'shared', label: <><MaleIcon className="select-owner-icon" /><FemaleIcon className="select-owner-icon" /> משותף</> },
          ]}
        />
      </label>
      <label htmlFor={`${idPrefix}-geography`}>
        <span className="field-label-row">
          אזור גיאוגרפי
          <label className="breakdown-toggle">
            <input type="checkbox" checked={hasGeographyBreakdown} onChange={toggleGeography} />
            פיצול
          </label>
        </span>
        {hasGeographyBreakdown ? (
          <BreakdownInput
            idPrefix={`${idPrefix}-geography`}
            options={GEOGRAPHY_LABELS.map((label) => ({ value: label, label }))}
            breakdown={draft.geographyBreakdown!}
            onChange={(geographyBreakdown) => onChange({ geographyBreakdown })}
          />
        ) : (
          <Select
            id={`${idPrefix}-geography`}
            name={`${idPrefix}-geography`}
            value={draft.geography}
            onChange={(nextValue) => onChange({ geography: nextValue })}
            options={GEOGRAPHY_LABELS.map((label) => ({ value: label, label }))}
          />
        )}
      </label>
      <label className="full-width" htmlFor={`${idPrefix}-note`}>
        הערה
        <input id={`${idPrefix}-note`} name={`${idPrefix}-note`} value={draft.note} onChange={(event) => onChange({ note: event.target.value })} autoComplete="off" />
      </label>
    </>
  );
}
