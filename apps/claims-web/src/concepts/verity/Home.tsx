import { useEffect, useState } from 'react';
import { checks, ctas, faqs, illustrativeMetrics, illustrativeNote, pains, principles, stats, steps } from '../../content/index.ts';
import { DemoForm } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { LangToggle } from '../../lib/LangToggle.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import { Exhibit } from './Exhibit.tsx';
import { FolderMark, InkFilter, PaperClip, TickBox } from './marks.tsx';
import './verity.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800;900&family=Courier+Prime:wght@400;700&family=Alef:wght@400;700&family=Miriam+Libre:wght@400;700&display=swap';

const TABS = [
  { id: 'intake', label: bi('Intake', 'קליטה') },
  { id: 'exhibit', label: bi('Evidence', 'ראיות') },
  { id: 'examination', label: bi('Findings', 'ממצאים') },
  { id: 'procedure', label: bi('Procedure', 'נוהל') },
  { id: 'safeguards', label: bi('Safeguards', 'הגנות') },
  { id: 'demo', label: bi('Request', 'בקשה') },
] as const;

// Sections without their own tab light up the tab of the folder part they belong to.
const SECTION_TAB: Record<string, string> = {
  intake: 'intake',
  background: 'intake',
  exhibit: 'exhibit',
  examination: 'examination',
  references: 'examination',
  procedure: 'procedure',
  safeguards: 'safeguards',
  transcript: 'safeguards',
  demo: 'demo',
};

const META = [
  { k: bi('Claimant', 'מבוטח/ת'), v: bi('D. Levin', 'ד. לוין') },
  { k: bi('Filed', 'הוגשה'), v: bi('15 Sep 2024', '15.09.2024') },
  { k: bi('Exhibits', 'מוצגים'), v: bi('1 receipt photo', 'צילום קבלה אחד') },
  { k: bi('Examined by', 'נבדק על ידי'), v: bi('Verity (AI)', 'Verity (AI)') },
  { k: bi('Final decision', 'החלטה סופית'), v: bi('Your adjuster', 'השמאי שלכם') },
];

const HANDLED_BY = [bi('Your systems', 'המערכות שלכם'), bi('Verity', 'Verity'), bi('Verity', 'Verity'), bi('Your team', 'הצוות שלכם')];

function useActiveTab(): string {
  const [active, setActive] = useState('intake');
  useEffect(() => {
    const els = Object.keys(SECTION_TAB)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(SECTION_TAB[hit.target.id]);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export function Home() {
  useFonts(FONTS);
  const { t } = useLang();
  const active = useActiveTab();

  return (
    <div className="c-verity">
      <InkFilter />
      <a className="v-skip" href="#exhibit">
        {t(bi('Skip to the receipt analysis', 'דלגו לניתוח הקבלה'))}
      </a>

      <header className="v-head">
        <div className="v-head__bar">
          <a className="v-brand" href="#intake" aria-label={t(bi('Verity, back to top', 'Verity, חזרה למעלה'))}>
            <FolderMark />
            <span className="v-brand__name">Verity</span>
          </a>
          <div className="v-head__actions">
            <LangToggle className="v-lang" />
            <a className="v-btn v-btn--primary v-btn--sm" href="#demo">
              {t(ctas.primary)}
            </a>
          </div>
        </div>
        <nav className="v-tabs" aria-label={t(bi('Case file sections', 'חלקי התיק'))}>
          <ul>
            {TABS.map((tab) => (
              <li key={tab.id}>
                <a href={`#${tab.id}`} aria-current={active === tab.id ? 'location' : undefined}>
                  {t(tab.label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <section id="intake" className="v-intake" aria-labelledby="v-hero-title">
          <div className="v-folder">
            <div className="v-folder__tab">
              <span className="v-mono">{t(bi('CASE 24-08817', 'תיק 24-08817'))}</span>
              <span aria-hidden="true">·</span>
              <span>{t(bi('Outpatient visit', 'ביקור אצל רופא מומחה'))}</span>
              <span aria-hidden="true">·</span>
              <span className="v-mono" dir="ltr">
                {t(bi('$1,450', '₪1,450'))}
              </span>
            </div>
            <div className="v-folder__cover">
              <div className="v-cover-label">
                <h1 id="v-hero-title" className="v-hero-title">
                  {t(bi('Is this claim telling the truth?', 'התביעה הזו אומרת אמת?'))} <span>{t(bi('Know before you pay.', 'תדעו לפני שאתם משלמים.'))}</span>
                </h1>
                <p className="v-hero-lede">
                  {t(
                    bi(
                      'Verity uses AI to examine every receipt, photo and document your customers submit, and shows your team exactly what is genuine and what was altered, before the money goes out.',
                      'Verity בודקת בעזרת AI כל קבלה, תמונה ומסמך שהלקוחות מגישים, ומראה לצוות שלכם בדיוק מה אמיתי ומה שונה, לפני שהכסף יוצא.',
                    ),
                  )}
                </p>
                <div className="v-cta-row">
                  <a className="v-btn v-btn--primary" href="#demo">
                    {t(ctas.primary)}
                  </a>
                  <a className="v-btn v-btn--ghost" href="#exhibit">
                    {t(ctas.secondary)}
                  </a>
                </div>
              </div>

              <aside className="v-slip" aria-label={t(bi('Sample case details', 'פרטי תיק לדוגמה'))}>
                <PaperClip className="v-clip v-slip__clip" />
                <p className="v-slip__title">{t(bi('File record', 'רישום התיק'))}</p>
                <dl className="v-fields">
                  {META.map((m) => (
                    <div key={m.k.en} className="v-field">
                      <dt className="v-label">{t(m.k)}</dt>
                      <dd className="v-typed">{t(m.v)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="v-slip__note">{t(bi('Sample case. Synthetic data.', 'תיק לדוגמה. נתונים מומצאים.'))}</p>
              </aside>
            </div>
          </div>
        </section>

        <section id="background" className="v-section" aria-labelledby="v-bg-title">
          <div className="v-wrap">
            <h2 id="v-bg-title" className="v-h2">
              {t(bi('Case background', 'רקע לתיק'))}
            </h2>
            <p className="v-intro">{t(bi('You already know how this goes. This is what your adjusters are up against every day.', 'אתם כבר מכירים את זה. זה מה שהשמאים שלכם מתמודדים איתו בכל יום.'))}</p>
            <article className="v-sheet v-memo">
              <dl className="v-memo__head">
                <div>
                  <dt className="v-label">{t(bi('To', 'אל'))}</dt>
                  <dd className="v-typed">{t(bi('Head of claims · Special investigations unit', 'מנהל/ת תביעות · יחידת החקירות'))}</dd>
                </div>
                <div>
                  <dt className="v-label">{t(bi('From', 'מאת'))}</dt>
                  <dd className="v-typed">Verity</dd>
                </div>
                <div>
                  <dt className="v-label">{t(bi('Re', 'הנדון'))}</dt>
                  <dd className="v-typed">{t(bi('Why claim documents can’t be taken at face value', 'למה אי אפשר לקבל מסמכי תביעה כפשוטם'))}</dd>
                </div>
              </dl>
              <ol className="v-memo__list">
                {pains.map((p) => (
                  <li key={p.title.en}>
                    <h3 className="v-memo__title">{t(p.title)}</h3>
                    <p>{t(p.text)}</p>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section id="exhibit" className="v-section v-section--exhibit" aria-labelledby="v-ex-title">
          <div className="v-wrap v-wrap--wide">
            <h2 id="v-ex-title" className="v-h2">
              {t(bi('Exhibit A: one receipt, examined line by line', 'מוצג א׳: קבלה אחת, נבדקת שורה אחר שורה'))}
            </h2>
            <p className="v-intro">
              {t(
                bi(
                  'A customer uploads a photo of a doctor’s receipt. Watch Verity read it, check every field against registries and past claims, and return a recommendation with the evidence attached.',
                  'לקוח מעלה צילום של קבלה מרופא. צפו איך Verity קוראת אותה, בודקת כל שדה מול מרשמים ותביעות קודמות, ומחזירה המלצה עם הראיות מצורפות.',
                ),
              )}
            </p>
            <Exhibit />
          </div>
        </section>

        <section id="examination" className="v-section" aria-labelledby="v-exam-title">
          <div className="v-wrap v-wrap--wide">
            <h2 id="v-exam-title" className="v-h2">
              {t(bi('Examination record: what every document goes through', 'פרוטוקול בדיקה: מה עובר כל מסמך'))}
            </h2>
            <p className="v-intro">
              {t(bi('Six examinations run on every receipt, photo and form. Each one leaves a written result your team can read.', 'שש בדיקות רצות על כל קבלה, תמונה וטופס. כל אחת משאירה תוצאה כתובה שהצוות שלכם יכול לקרוא.'))}
            </p>
            <div className="v-sheet v-record">
              <table className="v-table">
                <caption className="sr-only">{t(bi('Examinations performed on each document', 'הבדיקות שמבוצעות על כל מסמך'))}</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">{t(bi('Performed', 'בוצע'))}</span>
                    </th>
                    <th scope="col" className="v-label">
                      {t(bi('Examination', 'בדיקה'))}
                    </th>
                    <th scope="col" className="v-label">
                      {t(bi('What it looks at', 'מה נבדק'))}
                    </th>
                    <th scope="col" className="v-label">
                      {t(bi('Example finding', 'ממצא לדוגמה'))}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.key}>
                      <td className="v-table__tick">
                        <TickBox />
                      </td>
                      <th scope="row" className="v-table__title">
                        {t(c.title)}
                      </th>
                      <td className="v-table__text">{t(c.text)}</td>
                      <td className="v-table__result">
                        <span className="v-label v-table__mlabel" aria-hidden="true">
                          {t(bi('Example finding', 'ממצא לדוגמה'))}
                        </span>
                        <span className="v-typed">{t(c.example)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="references" className="v-section" aria-labelledby="v-ref-title">
          <div className="v-wrap v-wrap--wide">
            <h2 id="v-ref-title" className="v-h2">
              {t(bi('The cost of paying without looking', 'המחיר של לשלם בלי לבדוק'))}
            </h2>
            <p className="v-intro">{t(bi('Figures from public industry sources. Each one is referenced at the foot of the sheet.', 'נתונים ממקורות ציבוריים בתעשייה. לכל אחד יש הפניה בתחתית הדף.'))}</p>
            <div className="v-refs">
              <div className="v-sheet v-stats">
                <ul className="v-stats__list">
                  {stats.map((s, i) => (
                    <li key={s.url + i} className="v-stat">
                      <span className="v-stat__value" dir="ltr">
                        {t(s.value)}
                      </span>
                      <span className="v-stat__label">
                        {t(s.label)}
                        <sup>
                          <a href={`#v-fn-${i + 1}`} aria-label={t(bi(`Source ${i + 1}`, `מקור ${i + 1}`))}>
                            {i + 1}
                          </a>
                        </sup>
                      </span>
                    </li>
                  ))}
                </ul>
                <ol className="v-footnotes">
                  {stats.map((s, i) => (
                    <li key={s.url + i} id={`v-fn-${i + 1}`}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.source}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="v-draft">
                <h3 className="v-h3">{t(bi('What Verity is built to deliver', 'מה Verity נבנתה להשיג'))}</h3>
                <p className="v-draft__note">{t(illustrativeNote)}</p>
                <dl className="v-draft__list">
                  {illustrativeMetrics.map((m) => (
                    <div key={m.label.en}>
                      <dt className="v-draft__value" dir="ltr">
                        {t(m.value)}
                      </dt>
                      <dd>{t(m.label)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section id="procedure" className="v-section" aria-labelledby="v-proc-title">
          <div className="v-wrap v-wrap--wide">
            <h2 id="v-proc-title" className="v-h2">
              {t(bi('Procedure: from upload to decision', 'נוהל: מההעלאה ועד ההחלטה'))}
            </h2>
            <p className="v-intro">{t(bi('Verity slots into the claims flow you already run. Your customers and adjusters keep working the way they do today.', 'Verity משתלבת בתהליך התביעות שכבר קיים אצלכם. הלקוחות והשמאים ממשיכים לעבוד כמו היום.'))}</p>
            <ol className="v-sheet v-routing">
              {steps.map((s, i) => (
                <li key={s.title.en} className="v-route">
                  <span className="v-route__n v-mono" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="v-route__body">
                    <h3 className="v-route__title">{t(s.title)}</h3>
                    <p>{t(s.text)}</p>
                  </div>
                  <div className="v-route__by">
                    <span className="v-label">{t(bi('Handled by', 'באחריות'))}</span>
                    <span className="v-typed">{t(HANDLED_BY[i])}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="safeguards" className="v-section" aria-labelledby="v-safe-title">
          <div className="v-wrap">
            <h2 id="v-safe-title" className="v-h2">
              {t(bi('Safeguards: the AI recommends, people decide', 'הגנות: ה-AI ממליץ, אנשים מחליטים'))}
            </h2>
            <div className="v-sheet v-clauses">
              {principles.map((p) => (
                <div key={p.title.en} className="v-clause">
                  <h3 className="v-clause__title">{t(p.title)}</h3>
                  <p>{t(p.text)}</p>
                </div>
              ))}
              <div className="v-signoff">
                <span className="v-label">{t(bi('Authorized by', 'אושר על ידי'))}</span>
                <span className="v-signoff__line">
                  <span className="v-typed">{t(bi('A member of your claims team, every time', 'איש או אשת צוות התביעות שלכם, בכל פעם'))}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="transcript" className="v-section" aria-labelledby="v-faq-title">
          <div className="v-wrap">
            <h2 id="v-faq-title" className="v-h2">
              {t(bi('Interview transcript: the questions managers ask first', 'תמליל ראיון: השאלות שמנהלים שואלים קודם'))}
            </h2>
            <div className="v-sheet v-transcript">
              <p className="v-transcript__meta">
                <span className="v-label">{t(bi('Present', 'נוכחים'))}</span> <span className="v-typed">{t(bi('Claims manager (Q) · Verity team (A)', 'מנהל/ת תביעות (ש) · צוות Verity (ת)'))}</span>
              </p>
              {faqs.map((f) => (
                <details key={f.q.en} className="v-qa">
                  <summary>
                    <span className="v-qa__who" aria-hidden="true">
                      {t(bi('Q', 'ש'))}
                    </span>
                    <span className="v-qa__q">{t(f.q)}</span>
                    <span className="v-qa__chev" aria-hidden="true" />
                  </summary>
                  <div className="v-qa__a">
                    <span className="v-qa__who" aria-hidden="true">
                      {t(bi('A', 'ת'))}
                    </span>
                    <p>{t(f.a)}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="v-section v-section--request" aria-labelledby="v-req-title">
          <div className="v-wrap">
            <h2 id="v-req-title" className="v-h2">
              {t(bi('Open a file on your own claims', 'פתחו תיק על התביעות שלכם'))}
            </h2>
            <p className="v-intro">
              {t(bi('Book a demo, or start with a retro-pilot: we run Verity over a sample of your settled claims and show you what it would have caught.', 'קבעו הדגמה, או התחילו בפיילוט לאחור: נריץ את Verity על מדגם של תביעות שכבר נסגרו ונראה לכם מה היא הייתה תופסת.'))}
            </p>
            <div className="v-sheet v-request">
              <div className="v-request__head">
                <span className="v-request__form">{t(bi('Request for demonstration', 'בקשה להדגמה'))}</span>
                <span className="v-request__case">
                  <span className="v-label">{t(bi('Case no.', 'מס׳ תיק'))}</span> <span className="v-typed">{t(bi('assigned on receipt', 'יוקצה עם הקבלה'))}</span>
                </span>
              </div>
              <DemoForm className="v-form" />
            </div>
          </div>
        </section>
      </main>

      <footer className="v-foot">
        <div className="v-wrap v-wrap--wide v-foot__in">
          <div className="v-foot__brand">
            <span className="v-brand">
              <FolderMark />
              <span className="v-brand__name">Verity</span>
            </span>
            <p>{t(bi('AI examination of claim documents, before you pay.', 'בדיקת מסמכי תביעה בעזרת AI, לפני שמשלמים.'))}</p>
          </div>
          <p className="v-foot__legal">
            © 2026 Verity · {t(bi('Concept preview. Not a live product; all case data is synthetic.', 'תצוגת קונספט. לא מוצר חי; כל נתוני התיק מומצאים.'))}
          </p>
        </div>
      </footer>
    </div>
  );
}
