import { useState } from 'react';
import { Link } from 'react-router-dom';
import { concepts, type ConceptSlug } from './concepts.ts';
import { useLang } from './i18n.tsx';
import { LangToggle } from './LangToggle.tsx';
import './concept-switcher.css';

export function ConceptSwitcher({ current }: { current: ConceptSlug }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const active = concepts.find((c) => c.slug === current)!;

  return (
    <nav className={`cs-switch${open ? ' is-open' : ''}`} aria-label={t({ en: 'Switch concept', he: 'מעבר בין קונספטים' })}>
      {open && (
        <div className="cs-switch__panel" id="cs-switch-panel">
          <Link to="/" className="cs-switch__home">
            {t({ en: '← All three concepts', he: '→ כל שלושת הקונספטים' })}
          </Link>
          <ol className="cs-switch__list">
            {concepts.map((c) => (
              <li key={c.slug}>
                <Link to={`/${c.slug}`} aria-current={c.slug === current ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <span className="cs-switch__n">{c.index}</span>
                  <span>
                    {c.name}
                    <small>{t(c.world)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <LangToggle className="cs-switch__lang" />
        </div>
      )}
      <button type="button" className="cs-switch__toggle" aria-expanded={open} aria-controls="cs-switch-panel" onClick={() => setOpen((o) => !o)}>
        <span className="cs-switch__n">{active.index}</span>
        <span>{active.name}</span>
        <span aria-hidden="true" className="cs-switch__chev">
          {open ? '×' : '⇅'}
        </span>
      </button>
    </nav>
  );
}
