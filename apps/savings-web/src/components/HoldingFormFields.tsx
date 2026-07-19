import type { HoldingDraft } from '../types';
import { Select } from './Select';

type HoldingFormFieldsProps = {
  readonly idPrefix: string;
  readonly draft: HoldingDraft;
  readonly onChange: (changes: Partial<HoldingDraft>) => void;
};

export function HoldingFormFields({ idPrefix, draft, onChange }: HoldingFormFieldsProps) {
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
        חשיפת מטבע
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
      </label>
      <label htmlFor={`${idPrefix}-type`}>
        סוג נכס
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
      </label>
      <label htmlFor={`${idPrefix}-owner`}>
        בעלים
        <Select
          id={`${idPrefix}-owner`}
          name={`${idPrefix}-owner`}
          value={draft.owner}
          onChange={(nextValue) => onChange({ owner: (nextValue === 'guy' || nextValue === 'tody' ? nextValue : 'shared') })}
          options={[
            { value: 'guy', label: 'גוז 👦' },
            { value: 'tody', label: 'תודי 👧' },
            { value: 'shared', label: 'משותף 👦👧' },
          ]}
        />
      </label>
      <label htmlFor={`${idPrefix}-category`}>
        קטגוריה
        <input id={`${idPrefix}-category`} name={`${idPrefix}-category`} value={draft.category} onChange={(event) => onChange({ category: event.target.value })} autoComplete="off" />
      </label>
      <label htmlFor={`${idPrefix}-geography`}>
        אזור גיאוגרפי
        <input id={`${idPrefix}-geography`} name={`${idPrefix}-geography`} value={draft.geography} onChange={(event) => onChange({ geography: event.target.value })} autoComplete="off" />
      </label>
      <label className="full-width" htmlFor={`${idPrefix}-note`}>
        הערה
        <input id={`${idPrefix}-note`} name={`${idPrefix}-note`} value={draft.note} onChange={(event) => onChange({ note: event.target.value })} autoComplete="off" />
      </label>
    </>
  );
}
