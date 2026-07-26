import type { BreakdownRecord } from '../types';

type BreakdownOption = {
  readonly value: string;
  readonly label: string;
};

type BreakdownInputProps = {
  readonly idPrefix: string;
  readonly options: readonly BreakdownOption[];
  readonly breakdown: BreakdownRecord;
  readonly onChange: (breakdown: BreakdownRecord) => void;
};

export function BreakdownInput({ idPrefix, options, breakdown, onChange }: BreakdownInputProps) {
  const isBinary = options.length === 2;
  const total = Object.values(breakdown).reduce((sum, v) => sum + (v || 0), 0);
  const isValid = Math.abs(total - 100) < 0.5;

  function handleChange(key: string, rawValue: number): void {
    const value = Math.max(0, Math.min(100, Number.isFinite(rawValue) ? rawValue : 0));
    if (isBinary) {
      const otherKey = options.find((o) => o.value !== key)!.value;
      onChange({ [key]: value, [otherKey]: 100 - value });
    } else {
      onChange({ ...breakdown, [key]: value });
    }
  }

  return (
    <div className="breakdown-input">
      <div className="breakdown-rows">
        {options.map((option) => (
          <div className="breakdown-row" key={option.value}>
            <label htmlFor={`${idPrefix}-${option.value}`}>{option.label}</label>
            <div className="input-with-unit breakdown-percent-input">
              <input
                id={`${idPrefix}-${option.value}`}
                type="number"
                min={0}
                max={100}
                step={1}
                value={breakdown[option.value] || ''}
                onChange={(e) => handleChange(option.value, e.target.valueAsNumber)}
              />
              <span>%</span>
            </div>
          </div>
        ))}
      </div>
      <div className={`breakdown-total${isValid ? '' : ' is-error'}`}>
        סה״כ {total.toFixed(0)}%
      </div>
    </div>
  );
}
