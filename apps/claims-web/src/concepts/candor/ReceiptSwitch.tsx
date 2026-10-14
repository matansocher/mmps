import type { Scenario } from '../../content/index.ts';
import { receipt } from '../../content/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';

const copy = {
  label: bi('Show the altered receipt', 'להציג את הקבלה המזויפת'),
  honest: bi('Honest', 'אמיתית'),
  altered: bi('Altered', 'מזויפת'),
};

type Props = { readonly scenario: Scenario; readonly onChange: (s: Scenario) => void };

export function ReceiptSwitch({ scenario, onChange }: Props) {
  const { t } = useLang();
  const altered = scenario === 'altered';

  return (
    <button type="button" role="switch" aria-checked={altered} aria-label={t(copy.label)} className="cd-switch" data-on={altered || undefined} onClick={() => onChange(altered ? 'genuine' : 'altered')}>
      <span className="cd-switch__side cd-switch__side--honest" aria-hidden="true">
        <span className="cd-switch__name">{t(copy.honest)}</span>
        <span className="cd-switch__amt" dir="ltr">
          {t(receipt.amountGenuine)}
        </span>
      </span>
      <span className="cd-switch__track" aria-hidden="true">
        <span className="cd-switch__knob" />
      </span>
      <span className="cd-switch__side cd-switch__side--altered" aria-hidden="true">
        <span className="cd-switch__name">{t(copy.altered)}</span>
        <span className="cd-switch__amt" dir="ltr">
          {t(receipt.amountAltered)}
        </span>
      </span>
    </button>
  );
}
