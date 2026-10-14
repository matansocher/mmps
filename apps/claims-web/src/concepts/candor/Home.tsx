import { useEffect, useState, type MouseEvent } from 'react';
import { checks, ctas, demoForm, faqs, illustrativeMetrics, illustrativeNote, pains, principles, stats, steps, type Scenario } from '../../content/index.ts';
import { DemoForm, ForensicDemo } from '../../demo/index.ts';
import { bi, useLang } from '../../lib/i18n.tsx';
import { LangToggle } from '../../lib/LangToggle.tsx';
import { useFonts } from '../../lib/useFonts.ts';
import { ClaimGrid } from './ClaimGrid.tsx';
import { ReceiptSwitch } from './ReceiptSwitch.tsx';
import './candor.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=Figtree:ital,wght@0,400..700;1,400..600&family=Secular+One&family=Assistant:wght@400..700&family=Courier+Prime:wght@400;700&display=swap';

const copy = {
  navLabel: bi('Main', 'ראשי'),
  menu: bi('Menu', 'תפריט'),
  nav: [
    { href: '#receipt', text: bi('See it work', 'איך זה עובד') },
    { href: '#checks', text: bi('What it checks', 'מה נבדק') },
    { href: '#principles', text: bi('Principles', 'עקרונות') },
    { href: '#faq', text: bi('FAQ', 'שאלות') },
  ],
  heroTitle: bi('Most of your customers are telling the truth. Pay them faster.', 'רוב הלקוחות שלכם אומרים את האמת. שלמו להם מהר יותר.'),
  heroLede: bi(
    'Candor’s AI checks every receipt, photo and document a customer sends, and spots the forged ones before you pay. Everyone else can be fast-tracked.',
    'ה-AI של Candor בודק כל קבלה, תמונה ומסמך שלקוח שולח, ומזהה את המזויפים לפני שאתם משלמים. כל השאר יכולים לעבור למסלול מהיר.',
  ),
  painsTitle: bi('One forged receipt slows down a hundred honest ones.', 'קבלה מזויפת אחת מעכבת מאה תביעות אמיתיות.'),
  painsLede: bi('You know the numbers. This is what they feel like inside a claims team, and to the customers waiting on it.', 'את המספרים אתם מכירים. ככה הם מרגישים בתוך מחלקת התביעות, ואצל הלקוחות שמחכים לה.'),
  demoTitle: bi('Same receipt. One digit apart.', 'אותה קבלה. ספרה אחת הבדל.'),
  demoLede: bi(
    'Flip the switch. The honest receipt passes every check and is cleared to pay. The altered one is held, with the evidence laid out for a person to judge.',
    'הפכו את המתג. הקבלה האמיתית עוברת את כל הבדיקות ומאושרת לתשלום. המזויפת מעוכבת, והראיות מונחות מול אדם שיחליט.',
  ),
  demoAfter: {
    genuine: bi('Every check passed. Paid today, no one waiting.', 'כל הבדיקות עברו. משולם היום, בלי שאף אחד מחכה.'),
    altered: bi('Held, not denied. An investigator decides, with the case already built.', 'מעוכבת, לא נדחית. חוקר מחליט, עם תיק מוכן.'),
  },
  checksTitle: bi('What Candor looks at, on every claim', 'על מה Candor מסתכל בכל תביעה'),
  checksLede: bi('Six kinds of evidence, read in seconds. Each leaves a trail an adjuster can follow.', 'שישה סוגי ראיות, נקראים תוך שניות. כל אחד משאיר עקבות ששמאי יכול לעקוב אחריהן.'),
  forExample: bi('For example:', 'לדוגמה:'),
  stepsTitle: bi('From inbox to decision', 'מהתיבה ועד ההחלטה'),
  principlesAi: bi('Candor checks, scores and explains.', 'Candor בודק, מדרג ומסביר.'),
  principlesTeam: bi('Your team approves, investigates and decides.', 'הצוות שלכם מאשר, חוקר ומחליט.'),
  proofTitle: bi('Fraud is paid for by the people who don’t commit it', 'את מחיר ההונאה משלמים מי שלא מבצעים אותה'),
  source: bi('Source', 'מקור'),
  pilotTitle: bi('What we’d aim for in a pilot', 'למה נכוון בפיילוט'),
  faqTitle: bi('Questions worth asking', 'שאלות ששווה לשאול'),
  formTitle: bi('Pay the honest majority faster. Starting with your own claims.', 'לשלם לרוב הישר מהר יותר. החל מהתביעות שלכם.'),
  formPilot: bi('Prefer proof first?', 'רוצים הוכחה קודם?'),
  formPilotText: bi('We can run Candor over a sample of your settled claims and show you what it would have caught.', 'נריץ את Candor על מדגם של תביעות שכבר נסגרו ונראה לכם מה הוא היה תופס.'),
  footLine: bi('Catch the one forged receipt. Pay everyone else faster.', 'לתפוס את הקבלה המזויפת. לשלם לכל השאר מהר יותר.'),
  footNote: bi('Concept preview. Not a live product; all demo data is synthetic.', 'תצוגת קונספט. לא מוצר פעיל; כל נתוני ההדגמה מומצאים.'),
};

const PAIN_ORDER = [2, 0, 1, 3];

function Mark() {
  return (
    <span className="cd-mark" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={i === 5 ? 'is-held' : undefined} />
      ))}
    </span>
  );
}

export function Home() {
  const { t, lang } = useLang();
  const [scenario, setScenario] = useState<Scenario>('altered');
  const [menuOpen, setMenuOpen] = useState(false);
  useFonts(FONTS);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.scrollBehavior = prev;
    };
  }, []);

  const openFlagged = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setScenario('altered');
    document.getElementById('receipt')?.scrollIntoView();
    window.history.replaceState(null, '', '#receipt');
  };

  return (
    <div className="c-candor" lang={lang}>
      <a className="cd-skip" href="#main">
        {t(bi('Skip to content', 'דילוג לתוכן'))}
      </a>
      <header className="cd-nav" data-open={menuOpen || undefined}>
        <div className="cd-wrap cd-nav__in">
          <a className="cd-brand" href="#top" aria-label="Candor">
            <Mark />
            <span>Candor</span>
          </a>
          <nav className="cd-nav__links" id="cd-menu" aria-label={t(copy.navLabel)}>
            {copy.nav.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
                {t(l.text)}
              </a>
            ))}
            <a className="cd-nav__cta" href="#demo" onClick={() => setMenuOpen(false)}>
              {t(ctas.primary)}
            </a>
          </nav>
          <div className="cd-nav__end">
            <LangToggle className="cd-lang" />
            <a className="cd-btn cd-btn--yellow cd-btn--sm" href="#demo">
              {t(ctas.primary)}
            </a>
            <button type="button" className="cd-menu" aria-expanded={menuOpen} aria-controls="cd-menu" onClick={() => setMenuOpen((o) => !o)}>
              <span className="cd-menu__bars" aria-hidden="true" />
              <span className="sr-only">{t(copy.menu)}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="cd-hero" id="top">
          <div className="cd-wrap cd-hero__in">
            <div className="cd-hero__text">
              <h1 className="cd-h1">{t(copy.heroTitle)}</h1>
              <p className="cd-lede">{t(copy.heroLede)}</p>
              <div className="cd-actions">
                <a className="cd-btn cd-btn--yellow" href="#demo">
                  {t(ctas.primary)}
                </a>
                <a className="cd-btn cd-btn--ghost" href="#receipt">
                  {t(ctas.secondary)} <span className="cd-arrow" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
            <ClaimGrid onOpen={openFlagged} />
          </div>
        </section>

        <section className="cd-pains" aria-labelledby="cd-pains-h">
          <div className="cd-wrap">
            <h2 className="cd-h2" id="cd-pains-h">
              {t(copy.painsTitle)}
            </h2>
            <p className="cd-sub">{t(copy.painsLede)}</p>
            <ul className="cd-pains__list">
              {PAIN_ORDER.map((i) => (
                <li key={i}>
                  <h3>{t(pains[i].title)}</h3>
                  <p>{t(pains[i].text)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cd-receipt" id="receipt" aria-labelledby="cd-receipt-h">
          <div className="cd-wrap">
            <div className="cd-receipt__head">
              <div>
                <h2 className="cd-h2" id="cd-receipt-h">
                  {t(copy.demoTitle)}
                </h2>
                <p className="cd-sub">{t(copy.demoLede)}</p>
              </div>
              <ReceiptSwitch scenario={scenario} onChange={setScenario} />
            </div>
            <ForensicDemo className="cd-fd" scenario={scenario} onScenarioChange={setScenario} showScenarioToggle={false} />
            <p className="cd-receipt__after" data-scenario={scenario}>
              <span className="cd-receipt__pip" aria-hidden="true" />
              {t(copy.demoAfter[scenario])}
            </p>
          </div>
        </section>

        <div className="cd-mint">
          <section className="cd-checks" id="checks" aria-labelledby="cd-checks-h">
            <div className="cd-wrap">
              <h2 className="cd-h2" id="cd-checks-h">
                {t(copy.checksTitle)}
              </h2>
              <p className="cd-sub">{t(copy.checksLede)}</p>
              <div className="cd-checks__flow">
                {checks.map((c) => (
                  <p key={c.key}>
                    <strong>{t(c.title)}.</strong> {t(c.text)}{' '}
                    <em>
                      {t(copy.forExample)} {t(c.example)}
                    </em>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="cd-steps" id="how" aria-labelledby="cd-steps-h">
            <div className="cd-wrap">
              <h2 className="cd-h2" id="cd-steps-h">
                {t(copy.stepsTitle)}
              </h2>
              <ol className="cd-steps__list">
                {steps.map((s, i) => (
                  <li key={s.title.en} className={i === steps.length - 1 ? 'is-last' : undefined}>
                    <h3>{t(s.title)}</h3>
                    <p>{t(s.text)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <section className="cd-principles" id="principles" aria-labelledby="cd-principles-h">
          <div className="cd-wrap">
            <div className="cd-principles__main">
              <h2 className="cd-statement" id="cd-principles-h">
                {t(principles[0].title)}
              </h2>
              <p className="cd-statement__text">{t(principles[0].text)}</p>
              <dl className="cd-split">
                <div>
                  <dt>Candor</dt>
                  <dd>{t(copy.principlesAi)}</dd>
                </div>
                <div className="is-team">
                  <dt>{t(bi('Your team', 'הצוות שלכם'))}</dt>
                  <dd>{t(copy.principlesTeam)}</dd>
                </div>
              </dl>
            </div>
            <ul className="cd-principles__more">
              {principles.slice(1).map((p) => (
                <li key={p.title.en}>
                  <h3>{t(p.title)}</h3>
                  <p>{t(p.text)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="cd-mint">
          <section className="cd-proof" aria-labelledby="cd-proof-h">
            <div className="cd-wrap">
              <h2 className="cd-h2" id="cd-proof-h">
                {t(copy.proofTitle)}
              </h2>
              <ul className="cd-stats">
                {stats.map((s) => (
                  <li key={s.url + s.source + s.value.en}>
                    <span className="cd-stats__value" dir="ltr">
                      {t(s.value)}
                    </span>
                    <span className="cd-stats__label">{t(s.label)}</span>
                    <a className="cd-stats__src" href={s.url} target="_blank" rel="noreferrer">
                      {t(copy.source)}: {s.source}
                      <span className="sr-only"> {t(bi('(opens in a new tab)', '(נפתח בכרטיסייה חדשה)'))}</span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="cd-pilot">
                <div className="cd-pilot__head">
                  <h3>{t(copy.pilotTitle)}</h3>
                  <p className="cd-pilot__note">{t(illustrativeNote)}</p>
                </div>
                <ul className="cd-pilot__list">
                  {illustrativeMetrics.map((m) => (
                    <li key={m.label.en}>
                      <span className="cd-pilot__value" dir="ltr">
                        {t(m.value)}
                      </span>
                      <span>{t(m.label)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="cd-faq" id="faq" aria-labelledby="cd-faq-h">
            <div className="cd-wrap cd-faq__in">
              <h2 className="cd-h2" id="cd-faq-h">
                {t(copy.faqTitle)}
              </h2>
              <div className="cd-faq__list">
                {faqs.map((f) => (
                  <details key={f.q.en}>
                    <summary>
                      <span>{t(f.q)}</span>
                      <span className="cd-faq__icon" aria-hidden="true" />
                    </summary>
                    <p>{t(f.a)}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="cd-demo" id="demo" aria-labelledby="cd-demo-h">
          <div className="cd-wrap cd-demo__in">
            <div className="cd-demo__text">
              <h2 className="cd-h2" id="cd-demo-h">
                {t(copy.formTitle)}
              </h2>
              <p className="cd-sub">{t(demoForm.intro)}</p>
              <p className="cd-demo__pilot">
                <strong>{t(copy.formPilot)}</strong> {t(copy.formPilotText)}
              </p>
            </div>
            <DemoForm className="cd-form" showIntro={false} />
          </div>
        </section>
      </main>

      <footer className="cd-foot">
        <div className="cd-wrap cd-foot__in">
          <span className="cd-brand cd-brand--foot">
            <Mark />
            <span>Candor</span>
          </span>
          <p>{t(copy.footLine)}</p>
          <p className="cd-foot__small">
            © 2026 Candor · {t(copy.footNote)}
          </p>
        </div>
      </footer>
    </div>
  );
}
