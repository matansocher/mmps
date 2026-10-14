import { useEffect, useState } from 'react';
import { checks, ctas, demoForm, estimator, faqs, illustrativeMetrics, illustrativeNote, pains, principles, stats, steps, syntheticNote } from '../../content/index.ts';
import { DemoForm, ForensicDemo, SavingsModel } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { LangToggle } from '../../lib/LangToggle.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import { Console } from './Console.tsx';
import './claimsight.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&family=Noto+Sans+Hebrew:wght@400..700&display=swap';

const NAV = [
  { href: '#analysis', label: bi('Product', 'המוצר') },
  { href: '#checks', label: bi('Detectors', 'גלאים') },
  { href: '#flow', label: bi('Integration', 'חיבור') },
  { href: '#trust', label: bi('Trust', 'אמון') },
  { href: '#savings', label: estimator.navLabel },
  { href: '#faq', label: bi('FAQ', 'שאלות') },
];

const answers = [
  bi('Every pixel is checked. A pasted “1” is outlined on screen before anyone approves the payment.', 'כל פיקסל נבדק. ״1״ שהודבק מסומן על המסך לפני שמישהו מאשר את התשלום.'),
  bi('Checks run at intake, in seconds, so a risky claim is held before the money leaves.', 'הבדיקות רצות כבר בקליטה, תוך שניות, כך שתביעה חשודה מעוכבת לפני שהכסף יוצא.'),
  bi('Clean claims are fast-tracked by your rules. Honest customers get paid sooner, not reviewed longer.', 'תביעות נקיות עוברות למסלול מהיר לפי הכללים שלכם. לקוחות ישרים מקבלים את הכסף מהר יותר.'),
  bi('Every stamp, photo and signature is matched against your full claims history, under any name.', 'כל חותמת, תמונה וחתימה מושווית מול כל היסטוריית התביעות שלכם, תחת כל שם.'),
];

const audit = [
  { time: '09:41:07', who: bi('Claimsight', 'Claimsight'), what: bi('Scored CLM-24-08817 at 94. Six checks, four flagged.', 'נתן ל-CLM-24-08817 ציון 94. שש בדיקות, ארבע חשודות.') },
  { time: '09:41:07', who: bi('Claimsight', 'Claimsight'), what: bi('Recommended: hold payout, refer to investigations.', 'המלצה: לעכב תשלום ולהעביר לחקירה.') },
  { time: '09:52:30', who: bi('R. Adjuster', 'ר. שמאית'), what: bi('Reviewed the evidence. Referred to investigations.', 'בדקה את הראיות. העבירה לחקירה.') },
];

const copy = {
  h1: bi('Every claim, checked before you pay.', 'כל תביעה נבדקת לפני שמשלמים.'),
  lede: bi(
    'Claimsight’s AI examines the receipts, photos and documents behind every claim, ranks each one by fraud risk and shows your adjusters the evidence. Clean claims go straight through. Risky ones wait for a person.',
    'ה-AI של Claimsight בוחן את הקבלות, התמונות והמסמכים שמאחורי כל תביעה, מדרג כל אחת לפי סיכון להונאה ומציג לשמאים את הראיות. תביעות נקיות עוברות מיד. חשודות מחכות לאדם.',
  ),
  todayH: bi('A day on the claims desk, before and after', 'יום על שולחן התביעות, לפני ואחרי'),
  todayLede: bi('You know these mornings. Here is what changes when every document is checked at intake.', 'אתם מכירים את הבקרים האלה. זה מה שמשתנה כשכל מסמך נבדק כבר בקליטה.'),
  today: bi('Your adjusters today', 'השמאים שלכם היום'),
  withUs: bi('With Claimsight', 'עם Claimsight'),
  openH: bi('Open a claim', 'פותחים תביעה'),
  openLede: bi(
    'This is what an adjuster sees after clicking CLM-24-08817: the customer’s photo of a doctor’s receipt, every check Claimsight ran on it, and why it scored 94. Switch to the genuine receipt to see a clean pass.',
    'זה מה ששמאי רואה אחרי לחיצה על CLM-24-08817: הצילום של קבלת הרופא שהלקוח העלה, כל בדיקה ש-Claimsight הריץ עליה, ולמה היא קיבלה ציון 94. עברו לקבלה האמיתית כדי לראות מעבר נקי.',
  ),
  queue: bi('Queue', 'תור'),
  checksH: bi('Six detectors run on every document', 'שישה גלאים רצים על כל מסמך'),
  checksLede: bi('Each detector is a module with its own evidence. Expand one to see the kind of finding it hands your adjusters.', 'כל גלאי הוא מודול עם ראיות משלו. פתחו אחד כדי לראות איזה ממצא הוא מעביר לשמאים.'),
  example: bi('Example evidence', 'ראיה לדוגמה'),
  flagged: bi('Flagged', 'חשוד'),
  flowH: bi('It plugs into the flow you already run', 'מתחבר לתהליך שכבר עובד אצלכם'),
  flowLede: bi('No new portal for customers, no new screen your adjusters have to babysit. Claimsight sits between intake and payout.', 'בלי פורטל חדש ללקוחות ובלי מסך חדש שהשמאים צריכים לשמור עליו. Claimsight יושב בין הקליטה לתשלום.'),
  source: bi('Your claims system', 'מערכת התביעות שלכם'),
  sourceChips: [bi('Core claims system', 'מערכת ליבה'), bi('Customer app', 'אפליקציית לקוחות'), bi('Email intake', 'תיבת דואר')],
  fastLane: bi('Fast-track', 'מסלול מהיר'),
  fastLaneText: bi('Clean claims, paid by your rules', 'תביעות נקיות, משולמות לפי הכללים שלכם'),
  invLane: bi('Investigations', 'חקירות'),
  invLaneText: bi('Risky claims, case already built', 'תביעות חשודות, עם תיק מוכן'),
  trustH: bi('Claimsight recommends. Your people decide.', 'Claimsight ממליץ. האנשים שלכם מחליטים.'),
  trustLede: bi('Every score is a recommendation with its evidence attached, and every decision is logged with a name next to it.', 'כל ציון הוא המלצה עם הראיות שלה, וכל החלטה נרשמת עם שם לידה.'),
  auditTitle: bi('Audit trail · CLM-24-08817', 'תיעוד פעולות · CLM-24-08817'),
  proofH: bi('The money is already leaving', 'הכסף כבר יוצא'),
  proofLede: bi('Public figures on what insurance fraud costs. Follow the links to the sources.', 'נתונים ציבוריים על העלות של הונאות ביטוח. הקישורים מובילים למקורות.'),
  sourceLabel: bi('Source', 'מקור'),
  targetsH: bi('What we’ll aim for in your pilot', 'היעדים שנכוון אליהם בפיילוט שלכם'),
  faqH: bi('Questions claims leaders ask', 'שאלות שמנהלי תביעות שואלים'),
  demoH: bi('See it on your own claims', 'לראות את זה על התביעות שלכם'),
  next: [
    bi('A walkthrough of the triage console with your lines of business', 'סיור בקונסולת המיון עם תחומי הפעילות שלכם'),
    bi('A retro-pilot plan over a sample of your settled claims', 'תוכנית לפיילוט לאחור על מדגם של תביעות שנסגרו'),
    bi('How it connects to your claims system and intake', 'איך זה מתחבר למערכת התביעות ולקליטה שלכם'),
  ],
  footLine: bi('AI document checks for insurance claims. People decide.', 'בדיקת מסמכים ב-AI לתביעות ביטוח. אנשים מחליטים.'),
  preview: bi('Concept preview, not a live product.', 'תצוגת קונספט, לא מוצר פעיל.'),
  menu: bi('Menu', 'תפריט'),
  home: bi('Claimsight, back to top', 'Claimsight, חזרה למעלה'),
};

function Mark() {
  return (
    <svg className="cs-mark" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="#2f54eb" />
      <path d="M7 9.5h14M7 14h9M7 18.5h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 18.6l2 2 3.6-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="cs-module__chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Home() {
  const { t } = useLang();
  const [menu, setMenu] = useState(false);
  useFonts(FONTS);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  return (
    <div className="c-claimsight">
      <header className="cs-nav">
        <div className="cs-nav__in">
          <a className="cs-brand" href="#top" aria-label={t(copy.home)}>
            <Mark />
            <span>Claimsight</span>
          </a>
          <nav className={`cs-nav__links${menu ? ' is-open' : ''}`} id="cs-menu" aria-label={t(copy.menu)}>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenu(false)}>
                {t(n.label)}
              </a>
            ))}
            <a className="cs-btn cs-btn--primary cs-nav__menucta" href="#demo" onClick={() => setMenu(false)}>
              {t(ctas.primary)}
            </a>
          </nav>
          <div className="cs-nav__end">
            <LangToggle className="cs-lang" />
            <a className="cs-btn cs-btn--primary cs-nav__cta" href="#demo">
              {t(ctas.primary)}
            </a>
            <button type="button" className="cs-iconbtn cs-nav__toggle" aria-expanded={menu} aria-controls="cs-menu" aria-label={t(copy.menu)} onClick={() => setMenu((m) => !m)}>
              <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
                {menu ? (
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                ) : (
                  <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="cs-hero" aria-labelledby="cs-h1">
          <div className="cs-wrap cs-hero__copy">
            <h1 id="cs-h1">{t(copy.h1)}</h1>
            <div className="cs-hero__side">
              <p className="cs-lede">{t(copy.lede)}</p>
              <div className="cs-ctas">
                <a className="cs-btn cs-btn--primary cs-btn--lg" href="#demo">
                  {t(ctas.primary)}
                </a>
                <a className="cs-btn cs-btn--ghost cs-btn--lg" href="#analysis">
                  {t(ctas.secondary)}
                </a>
              </div>
            </div>
          </div>
          <div className="cs-wrap cs-hero__console" id="console">
            <Console />
          </div>
        </section>

        <section className="cs-sec" id="today" aria-labelledby="cs-today">
          <div className="cs-wrap">
            <div className="cs-sechead">
              <h2 id="cs-today">{t(copy.todayH)}</h2>
              <p>{t(copy.todayLede)}</p>
            </div>
            <div className="cs-compare">
              <div className="cs-compare__head" aria-hidden="true">
                <span>{t(copy.today)}</span>
                <span>{t(copy.withUs)}</span>
              </div>
              {pains.map((p, i) => (
                <div className="cs-compare__row" key={p.title.en}>
                  <div className="cs-compare__today">
                    <span className="cs-compare__label">{t(copy.today)}</span>
                    <h3>{t(p.title)}</h3>
                    <p>{t(p.text)}</p>
                  </div>
                  <div className="cs-compare__with">
                    <span className="cs-compare__label">{t(copy.withUs)}</span>
                    <p>{t(answers[i])}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cs-sec cs-sec--white" id="analysis" aria-labelledby="cs-open">
          <div className="cs-wrap">
            <div className="cs-sechead">
              <h2 id="cs-open">{t(copy.openH)}</h2>
              <p>{t(copy.openLede)}</p>
            </div>
            <div className="cs-panel">
              <div className="cs-panel__bar">
                <span>{t(copy.queue)}</span>
                <svg className="cs-flip" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <strong className="cs-mono">CLM-24-08817</strong>
              </div>
              <ForensicDemo className="cs-fd" />
            </div>
          </div>
        </section>

        <section className="cs-sec" id="checks" aria-labelledby="cs-checks">
          <div className="cs-wrap cs-split">
            <div className="cs-sechead cs-sechead--side">
              <h2 id="cs-checks">{t(copy.checksH)}</h2>
              <p>{t(copy.checksLede)}</p>
            </div>
            <div className="cs-modules">
              {checks.map((c, i) => (
                <details key={c.key} className="cs-module" open={i === 0}>
                  <summary>
                    <span className="cs-module__name">{t(c.title)}</span>
                    <span className="cs-module__id cs-mono" dir="ltr">
                      det.{c.key}
                    </span>
                    <Chevron />
                  </summary>
                  <div className="cs-module__body">
                    <p>{t(c.text)}</p>
                    <div className="cs-evidence">
                      <span className="cs-evidence__label">{t(copy.example)}</span>
                      <span className="cs-evidence__row">
                        <span className="cs-pill cs-pill--high">{t(copy.flagged)}</span>
                        <span>{t(c.example)}</span>
                      </span>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cs-sec cs-sec--white" id="flow" aria-labelledby="cs-flow">
          <div className="cs-wrap cs-split">
            <div className="cs-sechead cs-sechead--side">
              <h2 id="cs-flow">{t(copy.flowH)}</h2>
              <p>{t(copy.flowLede)}</p>
            </div>
            <div className="cs-flow">
              <div className="cs-node cs-node--source">
                <span className="cs-node__name">{t(copy.source)}</span>
                <span className="cs-chips">
                  {copy.sourceChips.map((c) => (
                    <span key={c.en} className="cs-chip">
                      {t(c)}
                    </span>
                  ))}
                </span>
                <p className="cs-step">
                  <strong>{t(steps[0].title)}.</strong> {t(steps[0].text)}
                </p>
              </div>
              <div className="cs-wire" aria-hidden="true" />
              <div className="cs-node cs-node--engine">
                <span className="cs-node__name">
                  <Mark />
                  Claimsight
                </span>
                <div className="cs-engine">
                  {steps.slice(1, 3).map((s) => (
                    <p className="cs-step" key={s.title.en}>
                      <strong>{t(s.title)}.</strong> {t(s.text)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="cs-fork" aria-hidden="true">
                <span className="cs-fork__a" />
                <span className="cs-fork__b" />
              </div>
              <div className="cs-outs">
                <div className="cs-node cs-node--out">
                  <span className="cs-node__name">
                    <span className="cs-dot cs-dot--clean" aria-hidden="true" />
                    {t(copy.fastLane)}
                  </span>
                  <span className="cs-node__text">{t(copy.fastLaneText)}</span>
                </div>
                <div className="cs-node cs-node--out">
                  <span className="cs-node__name">
                    <span className="cs-dot cs-dot--high" aria-hidden="true" />
                    {t(copy.invLane)}
                  </span>
                  <span className="cs-node__text">{t(copy.invLaneText)}</span>
                </div>
              </div>
              <p className="cs-step cs-step--decide">
                <strong>{t(steps[3].title)}.</strong> {t(steps[3].text)}
              </p>
            </div>
          </div>
        </section>

        <section className="cs-sec" id="trust" aria-labelledby="cs-trust">
          <div className="cs-wrap cs-split">
            <div className="cs-sechead cs-sechead--side">
              <h2 id="cs-trust">{t(copy.trustH)}</h2>
              <p>{t(copy.trustLede)}</p>
            </div>
            <div className="cs-trust">
              <ul className="cs-principles">
                {principles.map((p) => (
                  <li key={p.title.en}>
                    <h3>{t(p.title)}</h3>
                    <p>{t(p.text)}</p>
                  </li>
                ))}
              </ul>
              <figure className="cs-audit">
                <figcaption>{t(copy.auditTitle)}</figcaption>
                <ol>
                  {audit.map((a, i) => (
                    <li key={i}>
                      <span className="cs-mono cs-audit__time">{a.time}</span>
                      <span>
                        <strong>{t(a.who)}</strong> {t(a.what)}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="cs-audit__note">{t(syntheticNote)}</p>
              </figure>
            </div>
          </div>
        </section>

        <section className="cs-sec cs-sec--white" id="proof" aria-labelledby="cs-proof">
          <div className="cs-wrap">
            <div className="cs-sechead">
              <h2 id="cs-proof">{t(copy.proofH)}</h2>
              <p>{t(copy.proofLede)}</p>
            </div>
            <ul className="cs-stats">
              {stats.map((s) => (
                <li key={s.url + s.label.en}>
                  <span className="cs-stats__value" dir={/[\u0590-\u05FF]/.test(t(s.value)) ? undefined : 'ltr'}>{t(s.value)}</span>
                  <span className="cs-stats__label">{t(s.label)}</span>
                  <a className="cs-stats__src" href={s.url} target="_blank" rel="noreferrer">
                    <span className="sr-only">{t(copy.sourceLabel)}: </span>
                    {s.source}
                    <svg className="cs-flip" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                      <path d="M6 4h6v6M12 4l-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>

            <div className="cs-savings" id="savings">
              <div className="cs-savings__head">
                <h3>{t(estimator.title)}</h3>
                <p>{t(estimator.intro)}</p>
              </div>
              <SavingsModel className="cs-sm" />
            </div>

            <div className="cs-targets">
              <h3>{t(copy.targetsH)}</h3>
              <dl className="cs-counters cs-counters--targets">
                {illustrativeMetrics.map((m) => (
                  <div key={m.label.en}>
                    <dt>{t(m.label)}</dt>
                    <dd>
                      <bdi dir={/[\u0590-\u05FF]/.test(t(m.value)) ? undefined : 'ltr'}>{t(m.value)}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="cs-targets__note">{t(illustrativeNote)}</p>
            </div>
          </div>
        </section>

        <section className="cs-sec" id="faq" aria-labelledby="cs-faq">
          <div className="cs-wrap cs-split">
            <div className="cs-sechead cs-sechead--side">
              <h2 id="cs-faq">{t(copy.faqH)}</h2>
            </div>
            <div className="cs-modules">
              {faqs.map((f) => (
                <details key={f.q.en} className="cs-module">
                  <summary>
                    <span className="cs-module__name">{t(f.q)}</span>
                    <Chevron />
                  </summary>
                  <div className="cs-module__body">
                    <p>{t(f.a)}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="cs-sec cs-sec--white" id="demo" aria-labelledby="cs-demo">
          <div className="cs-wrap cs-split">
            <div className="cs-sechead cs-sechead--side">
              <h2 id="cs-demo">{t(copy.demoH)}</h2>
              <p>{t(demoForm.intro)}</p>
              <ul className="cs-next">
                {copy.next.map((n) => (
                  <li key={n.en}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t(n)}
                  </li>
                ))}
              </ul>
            </div>
            <DemoForm className="cs-form" showIntro={false} />
          </div>
        </section>
      </main>

      <footer className="cs-foot">
        <div className="cs-wrap cs-foot__in">
          <span className="cs-brand">
            <Mark />
            <span>Claimsight</span>
          </span>
          <p>{t(copy.footLine)}</p>
          <p className="cs-foot__meta">
            © 2026 Claimsight · {t(copy.preview)} {t(syntheticNote)}
          </p>
        </div>
      </footer>
    </div>
  );
}
