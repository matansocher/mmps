import { useState } from 'react';
import { ctas, demoForm, faqs, illustrativeMetrics, illustrativeNote, pains, principles, stats, steps } from '../../content/index.ts';
import { DemoForm, ForensicDemo } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { LangToggle } from '../../lib/LangToggle.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import { faq, footer, hero, intake, nav, notes, procedure, proof, trust } from './copy.ts';
import { Lab } from './Lab.tsx';
import './lumen.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@400;500&family=Rubik:wght@300..800&display=swap';

function Mark() {
  return (
    <svg className="lm-logo" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.5" fill="#d8ff3e" />
    </svg>
  );
}

function Reg({ className }: { readonly className: string }) {
  return (
    <svg className={`lm-reg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function Home() {
  const { t, lang } = useLang();
  useFonts(FONTS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoRun, setDemoRun] = useState(0);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="c-lumen" data-lang={lang} id="top">
      <a className="lm-skip" href="#main">
        {t(bi('Skip to content', 'דילוג לתוכן'))}
      </a>
      <header className="lm-nav">
        <div className="lm-wrap lm-nav__in">
          <a className="lm-brand" href="#top" onClick={closeMenu}>
            <Mark />
            <span>Lumen</span>
          </a>
          <nav className={`lm-nav__links${menuOpen ? ' is-open' : ''}`} id="lm-menu" aria-label={t(nav.label)}>
            {nav.links.map((l) => (
              <a key={l.href} href={l.href} onClick={closeMenu}>
                {t(l.label)}
              </a>
            ))}
            <a className="lm-btn lm-btn--primary lm-nav__cta-m" href="#demo" onClick={closeMenu}>
              {t(ctas.primary)}
            </a>
          </nav>
          <div className="lm-nav__end">
            <LangToggle className="lm-lang" />
            <a className="lm-btn lm-btn--primary lm-btn--sm lm-nav__cta" href="#demo">
              {t(ctas.primary)}
            </a>
            <button type="button" className="lm-menu" aria-expanded={menuOpen} aria-controls="lm-menu" onClick={() => setMenuOpen((o) => !o)}>
              <span className="lm-menu__icon" aria-hidden="true" />
              <span>{t(nav.menu)}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="lm-hero" aria-labelledby="lm-hero-title">
          <div className="lm-wrap lm-hero__grid">
            <div className="lm-hero__copy">
              <h1 id="lm-hero-title">
                <span>{t(hero.titleA)}</span> <span className="lm-glow">{t(hero.titleB)}</span>
              </h1>
              <p className="lm-lede">{t(hero.lede)}</p>
              <div className="lm-ctas">
                <a className="lm-btn lm-btn--primary" href="#demo">
                  {t(ctas.primary)}
                </a>
                <a className="lm-btn lm-btn--ghost" href="#analysis" onClick={() => setDemoRun((n) => n + 1)}>
                  {t(ctas.secondary)}
                </a>
              </div>
              <p className="lm-assure">
                <Reg className="lm-assure__reg" />
                {t(hero.assurance)}
              </p>
            </div>

            <div className="lm-bench" id="analysis" role="region" aria-label={t(hero.stageLabel)}>
              <div className="lm-bench__tag">
                <span>{t(hero.exhibit)}</span>
                <span className="lm-mono">CLM-24-08817</span>
              </div>
              <span className="lm-ruler lm-ruler--top" aria-hidden="true" />
              <span className="lm-ruler lm-ruler--side" aria-hidden="true" />
              <Reg className="lm-reg--ss" />
              <Reg className="lm-reg--se" />
              <Reg className="lm-reg--es" />
              <Reg className="lm-reg--ee" />
              <ForensicDemo key={demoRun} className="lm-fd" />
            </div>
          </div>
        </section>

        <section className="lm-section lm-notes" id="notes" aria-labelledby="lm-notes-title">
          <div className="lm-wrap lm-notes__grid">
            <div className="lm-head">
              <h2 id="lm-notes-title">{t(notes.title)}</h2>
              <p>{t(notes.intro)}</p>
            </div>
            <div className="lm-sheet">
              <div className="lm-sheet__top">
                <span>{t(notes.sheet)}</span>
                <span className="lm-mono">CN-0412</span>
              </div>
              <ul className="lm-sheet__list">
                {pains.map((p) => (
                  <li key={p.title.en}>
                    <h3>{t(p.title)}</h3>
                    <p>{t(p.text)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Lab />

        <section className="lm-section lm-proc" id="procedure" aria-labelledby="lm-proc-title">
          <div className="lm-wrap">
            <div className="lm-head">
              <h2 id="lm-proc-title">{t(procedure.title)}</h2>
              <p>{t(procedure.intro)}</p>
            </div>
            <ol className="lm-proc__list">
              {steps.map((s, i) => (
                <li key={s.title.en}>
                  <span className="lm-proc__n">
                    <span className="sr-only">{t(procedure.step)} </span>
                    {i + 1}
                  </span>
                  <h3>{t(s.title)}</h3>
                  <p>{t(s.text)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lm-section lm-trust" id="trust" aria-labelledby="lm-trust-title">
          <div className="lm-wrap lm-trust__grid">
            <div className="lm-head">
              <h2 id="lm-trust-title">{t(trust.title)}</h2>
              <p>{t(trust.intro)}</p>
            </div>
            <dl className="lm-trust__list">
              {principles.map((p) => (
                <div key={p.title.en}>
                  <dt>
                    <Reg className="lm-trust__reg" />
                    {t(p.title)}
                  </dt>
                  <dd>{t(p.text)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="lm-section lm-proof" id="proof" aria-labelledby="lm-proof-title">
          <div className="lm-wrap">
            <div className="lm-head">
              <h2 id="lm-proof-title">{t(proof.title)}</h2>
              <p>{t(proof.intro)}</p>
            </div>
            <ul className="lm-stats">
              {stats.map((s) => (
                <li key={s.url + s.value.en}>
                  <span className="lm-stats__v">{t(s.value)}</span>
                  <span className="lm-stats__l">{t(s.label)}</span>
                  <a className="lm-stats__src" href={s.url} target="_blank" rel="noreferrer">
                    {t(proof.source)}: {s.source}
                    <span className="lm-ext" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="lm-pilot">
              <h3>{t(proof.pilotTitle)}</h3>
              <ul className="lm-pilot__list">
                {illustrativeMetrics.map((m) => (
                  <li key={m.label.en}>
                    <span className="lm-pilot__v">{t(m.value)}</span>
                    <span className="lm-pilot__l">{t(m.label)}</span>
                  </li>
                ))}
              </ul>
              <p className="lm-pilot__note">{t(illustrativeNote)}</p>
            </div>
          </div>
        </section>

        <section className="lm-section lm-faq" id="faq" aria-labelledby="lm-faq-title">
          <div className="lm-wrap lm-faq__grid">
            <div className="lm-head">
              <h2 id="lm-faq-title">{t(faq.title)}</h2>
            </div>
            <div className="lm-faq__list">
              {faqs.map((f) => (
                <details key={f.q.en}>
                  <summary>
                    <span>{t(f.q)}</span>
                    <span className="lm-faq__icon" aria-hidden="true" />
                  </summary>
                  <p>{t(f.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lm-section lm-intake" id="demo" aria-labelledby="lm-demo-title">
          <div className="lm-wrap lm-intake__grid">
            <div className="lm-head">
              <h2 id="lm-demo-title">{t(demoForm.title)}</h2>
              <p>{t(demoForm.intro)}</p>
              <p className="lm-intake__lede">{t(intake.lede)}</p>
              <p className="lm-assure">
                <Reg className="lm-assure__reg" />
                {t(ctas.pilot)}
              </p>
            </div>
            <div className="lm-intake__form">
              <div className="lm-intake__top">
                <span>{t(intake.form)}</span>
                <span className="lm-mono">INT-0001</span>
              </div>
              <DemoForm className="lm-df" showIntro={false} />
            </div>
          </div>
        </section>
      </main>

      <footer className="lm-foot">
        <div className="lm-wrap lm-foot__in">
          <a className="lm-brand" href="#top">
            <Mark />
            <span>Lumen</span>
          </a>
          <p>{t(footer.line)}</p>
          <p className="lm-foot__small">© 2026 Lumen · {t(footer.preview)}</p>
        </div>
      </footer>
    </div>
  );
}
