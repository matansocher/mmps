import { useState } from 'react';
import { checks, ctas, demoForm, faqs, illustrativeMetrics, illustrativeNote, pains, principles, stats, steps } from '../../content/index.ts';
import { DemoForm, ForensicDemo } from '../../demo/index.ts';
import { LangToggle } from '../../lib/LangToggle.tsx';
import { bi, useLang, type Bi } from '../../lib/i18n.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import { CONTROLS_IN_EXHIBIT, copy, FN, NAME, sourceIdByUrl, sourceNotes } from './copy.ts';
import { Fn } from './Fn.tsx';
import { DEFAULT_MODEL, totals, type Model } from './model.ts';
import { Statement } from './Statement.tsx';
import { Waterfall } from './Waterfall.tsx';
import './ledgerline.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Public+Sans:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap';

const NAV: readonly { readonly href: string; readonly label: Bi }[] = [
  { href: '#bridge', label: bi('The model', 'המודל') },
  { href: '#exhibit', label: copy.exhibitWord },
  { href: '#controls', label: bi('Controls', 'בקרות') },
  { href: '#governance', label: copy.govTitle },
  { href: '#market', label: copy.marketTitle },
  { href: '#faq', label: bi('FAQ', 'שאלות') },
];

function Mark() {
  return (
    <svg className="ll-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8h16M6 12.5h16M6 17h9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 20.5h7M15 23h7" stroke="var(--ll-green)" strokeWidth="1.5" />
    </svg>
  );
}

function NoteTitle({ no, title, id }: { readonly no: Bi | string; readonly title: Bi; readonly id: string }) {
  const { t } = useLang();
  return (
    <h2 className="ll-note__title" id={id}>
      <span className="ll-note__no">{typeof no === 'string' ? no : t(no)}</span>
      <span className="ll-note__dash" aria-hidden="true">
        {' — '}
      </span>
      <span className="sr-only">: </span>
      {t(title)}
    </h2>
  );
}

export function Home() {
  useFonts(FONTS);
  const { t, lang } = useLang();
  const [model, setModel] = useState<Model>(() => ({ ...DEFAULT_MODEL, avgClaim: lang === 'he' ? 3500 : DEFAULT_MODEL.avgClaim }));
  const [menuOpen, setMenuOpen] = useState(false);
  const sums = totals(model);
  const note = (n: number) => `${t(copy.noteWord)} ${n}`;

  return (
    <div className="c-ledgerline">
      <a className="ll-skip" href="#ll-main">
        {t(copy.skip)}
      </a>

      <header className="ll-nav">
        <div className="ll-wrap ll-nav__in">
          <a className="ll-brand" href="#top" aria-label={t(copy.homeLabel)}>
            <Mark />
            <span className="ll-brand__name">{NAME}</span>
          </a>
          <nav className={`ll-nav__links${menuOpen ? ' is-open' : ''}`} id="ll-menu" aria-label={t(copy.navLabel)}>
            <ul role="list">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} onClick={() => setMenuOpen(false)}>
                    {t(n.label)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ll-nav__end">
            <button type="button" className="ll-menu" aria-expanded={menuOpen} aria-controls="ll-menu" onClick={() => setMenuOpen((o) => !o)}>
              {t(copy.contents)}
            </button>
            <LangToggle className="ll-lang" />
            <a className="ll-btn ll-btn--primary ll-btn--sm" href="#demo">
              {t(ctas.primary)}
            </a>
          </div>
        </div>
      </header>

      <main id="ll-main">
        <section className="ll-hero" id="top" aria-labelledby="ll-h1">
          <div className="ll-wrap">
            <div className="ll-report">
              <span className="ll-report__name">{t(copy.reportTitle)}</span>
              <span>{t(copy.period)}</span>
              <span className="ll-report__for">{t(copy.preparedFor)}</span>
            </div>
            <div className="ll-hero__grid">
              <div className="ll-hero__copy">
                <h1 id="ll-h1" className="ll-h1">
                  {t(copy.h1)}
                </h1>
                <p className="ll-lede">{t(copy.lede)}</p>
                <div className="ll-ctas">
                  <a className="ll-btn ll-btn--primary" href="#demo">
                    {t(ctas.primary)}
                  </a>
                  <a className="ll-btn ll-btn--ghost" href="#exhibit">
                    {t(ctas.secondary)}
                    <span className="ll-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                </div>
                <p className="ll-hero__aside">{t(copy.heroAside)}</p>
              </div>
              <Statement model={model} totals={sums} onChange={(patch) => setModel((m) => ({ ...m, ...patch }))} />
            </div>
          </div>
        </section>

        <section className="ll-note ll-note--bridge" id="bridge" aria-labelledby="ll-n1">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(1)} title={copy.bridgeTitle} id="ll-n1" />
              <p className="ll-note__lede">{t(copy.bridgeLede)}</p>
            </div>
            <div className="ll-note__body">
              <Waterfall totals={sums} />
            </div>
          </div>
        </section>

        <section className="ll-note" id="leakage" aria-labelledby="ll-n2">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(2)} title={copy.leakTitle} id="ll-n2" />
              <p className="ll-note__lede">{t(copy.leakLede)}</p>
            </div>
            <div className="ll-note__body">
              <table className="ll-table ll-table--stack">
                <thead>
                  <tr>
                    <th scope="col">{t(copy.colCondition)}</th>
                    <th scope="col">{t(copy.colWhatHappens)}</th>
                    <th scope="col">{t(copy.colPnl)}</th>
                  </tr>
                </thead>
                <tbody>
                  {pains.map((p, i) => (
                    <tr key={p.title.en}>
                      <th scope="row">{t(p.title)}</th>
                      <td data-label={t(copy.colWhatHappens)}>{t(p.text)}</td>
                      <td data-label={t(copy.colPnl)} className="ll-pnl">
                        {t(copy.pnl[i])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ll-exhibit" id="exhibit" aria-labelledby="ll-ex">
          <div className="ll-wrap">
            <div className="ll-exhibit__head">
              <NoteTitle no={copy.exhibitWord} title={copy.exhibitTitle} id="ll-ex" />
              <p className="ll-note__lede">
                {t(copy.exhibitLede)}
                <Fn n={FN.synthetic} />
              </p>
            </div>
            <ForensicDemo className="ll-fd" />
          </div>
        </section>

        <section className="ll-note" id="controls" aria-labelledby="ll-n3">
          <div className="ll-wrap">
            <div className="ll-note__head">
              <NoteTitle no={note(3)} title={copy.controlsTitle} id="ll-n3" />
              <p className="ll-note__lede">{t(copy.controlsLede)}</p>
            </div>
            <table className="ll-table ll-table--stack ll-table--controls">
              <thead>
                <tr>
                  <th scope="col">{t(copy.colControl)}</th>
                  <th scope="col">{t(copy.colTests)}</th>
                  <th scope="col">{t(copy.colExample)}</th>
                  <th scope="col" className="ll-center">
                    {t(copy.colInExhibit)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => {
                  const used = CONTROLS_IN_EXHIBIT.has(c.key);
                  return (
                    <tr key={c.key}>
                      <th scope="row">{t(c.title)}</th>
                      <td data-label={t(copy.colTests)}>{t(c.text)}</td>
                      <td data-label={t(copy.colExample)} className="ll-example">
                        {t(c.example)}
                      </td>
                      <td data-label={t(copy.colInExhibit)} className="ll-center">
                        <span className={`ll-tick${used ? ' is-on' : ''}`} aria-hidden="true">
                          {used ? '✓' : '–'}
                        </span>
                        <span className="sr-only">{t(used ? copy.yes : copy.no)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ll-note" id="process" aria-labelledby="ll-n4">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(4)} title={copy.processTitle} id="ll-n4" />
              <p className="ll-note__lede">{t(copy.processLede)}</p>
            </div>
            <div className="ll-note__body">
              <ol className="ll-process" role="list">
                {steps.map((s, i) => (
                  <li key={s.title.en} className={`ll-process__row${i === steps.length - 1 ? ' is-people' : ''}`}>
                    <span className="ll-process__n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="ll-process__main">
                      <h3>{t(s.title)}</h3>
                      <p>{t(s.text)}</p>
                    </div>
                    <span className="ll-process__who">
                      <span className="sr-only">{t(copy.colWho)}: </span>
                      {t(copy.who[i])}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="ll-note ll-note--band" id="governance" aria-labelledby="ll-n5">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(5)} title={copy.govTitle} id="ll-n5" />
              <p className="ll-note__lede">{t(copy.govLede)}</p>
            </div>
            <div className="ll-note__body">
              <dl className="ll-gov">
                {principles.map((p, i) => (
                  <div key={p.title.en} className="ll-gov__item">
                    <dt>
                      <span className="ll-gov__ref" aria-hidden="true">
                        5.{i + 1}
                      </span>
                      {t(p.title)}
                    </dt>
                    <dd>{t(p.text)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="ll-note" id="market" aria-labelledby="ll-n6">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(6)} title={copy.marketTitle} id="ll-n6" />
              <p className="ll-note__lede">{t(copy.marketLede)}</p>
            </div>
            <div className="ll-note__body">
              <table className="ll-table ll-table--figures">
                <thead>
                  <tr>
                    <th scope="col">{t(copy.colMeasure)}</th>
                    <th scope="col" className="ll-num">
                      {t(copy.colFigure)}
                    </th>
                    <th scope="col" className="ll-src-col">
                      {t(copy.colSource)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.label.en}>
                      <th scope="row">{t(s.label)}</th>
                      <td className="ll-num ll-fig">
                        <bdi>{t(s.value)}</bdi>
                        <Fn n={sourceIdByUrl[s.url]} />
                      </td>
                      <td className="ll-src-col">
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.source}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ll-note" id="targets" aria-labelledby="ll-n7">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(7)} title={copy.targetsTitle} id="ll-n7" />
              <p className="ll-note__lede">{t(copy.targetsLede)}</p>
            </div>
            <div className="ll-note__body">
              <table className="ll-table ll-table--targets">
                <caption className="ll-table__note">
                  {t(illustrativeNote)}
                  <Fn n={FN.illustrative} />
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t(copy.colTarget)}</th>
                    <th scope="col" className="ll-num">
                      {t(copy.colValue)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {illustrativeMetrics.map((m) => (
                    <tr key={m.label.en}>
                      <th scope="row">{t(m.label)}</th>
                      <td className="ll-num ll-fig">
                        <bdi>{t(m.value)}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="ll-note" id="faq" aria-labelledby="ll-n8">
          <div className="ll-wrap ll-note__grid">
            <div className="ll-note__side">
              <NoteTitle no={note(8)} title={copy.faqTitle} id="ll-n8" />
            </div>
            <div className="ll-note__body ll-faq">
              {faqs.map((f) => (
                <details key={f.q.en}>
                  <summary>
                    <span>{t(f.q)}</span>
                    <span className="ll-faq__icon" aria-hidden="true" />
                  </summary>
                  <p>{t(f.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="ll-demo" id="demo" aria-labelledby="ll-demo-title">
          <div className="ll-wrap ll-demo__grid">
            <div className="ll-demo__side">
              <h2 className="ll-demo__title" id="ll-demo-title">
                {t(copy.demoTitle)}
              </h2>
              <p className="ll-note__lede">{t(demoForm.intro)}</p>
              <h3 className="ll-demo__sub">{t(copy.demoNext)}</h3>
              <ol className="ll-demo__steps">
                {copy.demoSteps.map((s) => (
                  <li key={s.en}>{t(s)}</li>
                ))}
              </ol>
              <p className="ll-demo__pilot">{t(ctas.pilot)}</p>
            </div>
            <DemoForm className="ll-form" showIntro={false} />
          </div>
        </section>

        <section className="ll-notes" id="notes" aria-labelledby="ll-notes-title">
          <div className="ll-wrap">
            <h2 className="ll-notes__title" id="ll-notes-title">
              {t(copy.notesTitle)}
            </h2>
            <ol className="ll-notes__list" role="list">
              {sourceNotes.map((n) => (
                <li key={n.id} id={`ll-fn-${n.id}`}>
                  <span className="ll-notes__n" aria-hidden="true">
                    {n.id}
                  </span>
                  <p>
                    {t(n.text)}{' '}
                    {n.url && (
                      <a href={n.url} target="_blank" rel="noreferrer">
                        {n.linkText}
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="ll-foot">
        <div className="ll-wrap ll-foot__in">
          <span className="ll-brand ll-brand--foot">
            <Mark />
            <span className="ll-brand__name">{NAME}</span>
          </span>
          <p>{t(copy.footLine)}</p>
          <p className="ll-foot__meta">
            © 2026 {NAME}. {t(copy.footPreview)}
          </p>
        </div>
      </footer>
    </div>
  );
}
