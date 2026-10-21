import { useId, useState, type FormEvent } from 'react';
import { demoForm } from '../content/index.ts';
import { useLang } from '../lib/i18n.tsx';

type Props = { readonly className?: string; readonly showIntro?: boolean };

// Visual-only: nothing is sent. Concepts style the `.df-*` classes.
export function DemoForm({ className = '', showIntro = true }: Props) {
  const { t } = useLang();
  const id = useId();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (e.currentTarget.reportValidity()) setSent(true);
  };

  if (sent) {
    return (
      <div className={`df df--sent ${className}`.trim()} role="status">
        <p className="df-thanks">{t(demoForm.thanks)}</p>
        <button type="button" className="df-reset" aria-label={t({ en: "Start over", he: "להתחיל מחדש" })} onClick={() => setSent(false)}>
          ↺
        </button>
      </div>
    );
  }

  return (
    <form className={`df ${className}`.trim()} onSubmit={onSubmit} noValidate={false}>
      {showIntro && (
        <div className="df-head">
          <h3 className="df-title">{t(demoForm.title)}</h3>
          <p className="df-intro">{t(demoForm.intro)}</p>
        </div>
      )}
      <div className="df-grid">
        <label className="df-field">
          <span>{t(demoForm.name)}</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label className="df-field">
          <span>{t(demoForm.email)}</span>
          <input name="email" type="email" autoComplete="email" required dir="ltr" />
        </label>
        <label className="df-field">
          <span>{t(demoForm.company)}</span>
          <input name="company" autoComplete="organization" required />
        </label>
        <label className="df-field">
          <span>{t(demoForm.role)}</span>
          <input name="role" autoComplete="organization-title" />
        </label>
        <label className="df-field">
          <span>{t(demoForm.volume)}</span>
          <select name="volume" defaultValue="">
            <option value="" disabled>
              —
            </option>
            {demoForm.volumeOptions.map((o) => (
              <option key={o.en} value={o.en}>
                {t(o)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="df-field df-lines">
          <legend>{t(demoForm.lines)}</legend>
          <div className="df-chips">
            {demoForm.lineOptions.map((o) => (
              <label key={o.en} className="df-chip">
                <input type="checkbox" name="lines" value={o.en} id={`${id}-${o.en}`} />
                <span>{t(o)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="df-actions">
        <button type="submit" className="df-submit">
          {t(demoForm.submit)}
        </button>
        <p className="df-note">{t(demoForm.note)}</p>
      </div>
    </form>
  );
}
