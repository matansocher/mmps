import { useState } from 'react';
import { Link } from 'react-router-dom';
import { concepts, type Concept } from '../lib/concepts.ts';
import { bi, useLang } from '../lib/i18n.tsx';
import { LangToggle } from '../lib/LangToggle.tsx';
import { useFonts } from '../lib/useFonts.ts';
import './cover.css';

const copy = {
  meta: bi('Product landing page · 2 directions', 'דף נחיתה למוצר · 2 כיוונים'),
  title: bi('Two ways to tell insurers we catch the forged receipt.', 'שתי דרכים לספר למבטחים שאנחנו תופסים את הקבלה המזויפת.'),
  lead: bi(
    'The product: AI that examines every receipt, photo and document a customer submits with a claim, and flags what was edited, reused or invented before the insurer pays.',
    'המוצר: בינה מלאכותית שבודקת כל קבלה, תמונה ומסמך שלקוח מגיש עם תביעה, ומסמנת מה נערך, מוחזר או הומצא לפני שחברת הביטוח משלמת.',
  ),
  body: bi(
    'Each direction has its own name, its own visual world and a different manager in mind. Both tell the same true story and share the same live demo, a doctor’s receipt where $450 became $1,450, and the same savings model.',
    'לכל כיוון יש שם משלו, עולם חזותי משלו ומנהל אחר שהוא פונה אליו. שניהם מספרים את אותו סיפור אמיתי ומשתמשים באותה הדגמה חיה, קבלה מרופא שבה 450 הפכו ל-1,450, ובאותו מודל חיסכון.',
  ),
  listLabel: bi('The directions', 'הכיוונים'),
  option: bi('Option', 'אפשרות'),
  speaksTo: bi('Speaks to', 'פונה אל'),
  signature: bi('Signature moment', 'הרגע המרכזי'),
  open: bi('Open', 'לפתיחת'),
  sharedTitle: bi('What both share', 'מה משותף לשניהם'),
  foot: bi(
    'Internal presentation. Industry figures are real and cited on every page. Product metrics and claims are illustrative and marked as such.',
    'מצגת פנימית. נתוני התעשייה אמיתיים ומצוטטים בכל עמוד. מדדי המוצר והתביעות להמחשה בלבד ומסומנים ככאלה.',
  ),
};

const shared = [
  {
    title: bi('A demo, not a promise', 'הדגמה, לא הבטחה'),
    text: bi(
      'Every page plays the same animated analysis of a doctor’s receipt and shows the evidence behind each flag. Switch to the genuine receipt and it clears.',
      'בכל עמוד רצה אותה בדיקה מונפשת של קבלה מרופא, עם הראיה מאחורי כל סימון. מחליפים לקבלה האמיתית והיא עוברת.',
    ),
  },
  {
    title: bi('Real numbers, cited', 'מספרים אמיתיים, עם מקור'),
    text: bi(
      'Industry figures come from the Coalition Against Insurance Fraud, the FBI and the Insurance Information Institute, linked at the source.',
      'נתוני התעשייה לקוחים מ-Coalition Against Insurance Fraud, מה-FBI ומ-Insurance Information Institute, עם קישור למקור.',
    ),
  },
  {
    title: bi('People decide', 'האדם מחליט'),
    text: bi(
      'The product flags and explains. It never denies a claim on its own. Every page says so, because that is what earns a claims manager’s trust.',
      'המוצר מסמן ומסביר. הוא אף פעם לא דוחה תביעה לבד. כל עמוד אומר את זה, כי זה מה שבונה אמון אצל מנהל תביעות.',
    ),
  },
  {
    title: bi('English and Hebrew', 'אנגלית ועברית'),
    text: bi('Every page switches fully to Hebrew and right-to-left, works on a phone and respects reduced-motion settings.', 'כל עמוד עובר במלואו לעברית ומימין לשמאל, עובד בטלפון ומכבד את ההגדרה להפחתת תנועה.'),
  },
];

function Preview({ concept }: { concept: Concept }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="cv-card__fallback">{concept.name}</span>;
  }
  return <img src={`${import.meta.env.BASE_URL}${concept.preview}`} alt="" loading="lazy" width={1440} height={900} onError={() => setFailed(true)} />;
}

export function Cover() {
  useFonts('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Hebrew:wght@400;500;600&display=swap');
  const { t } = useLang();

  return (
    <div className="cv">
      <header className="cv-top">
        <span className="cv-top__meta">{t(copy.meta)}</span>
        <LangToggle className="cv-lang" />
      </header>

      <main>
        <section className="cv-intro" aria-labelledby="cv-title">
          <h1 id="cv-title">{t(copy.title)}</h1>
          <div className="cv-intro__body">
            <p className="cv-intro__lead">{t(copy.lead)}</p>
            <p>{t(copy.body)}</p>
          </div>
        </section>

        <section className="cv-list" aria-label={t(copy.listLabel)}>
          {concepts.map((c) => (
            <article key={c.slug} className="cv-card" style={{ ['--a' as string]: c.swatches[0], ['--b' as string]: c.swatches[1], ['--c' as string]: c.swatches[2] }}>
              <Link to={`/${c.slug}`} className="cv-card__visual" tabIndex={-1} aria-hidden="true">
                <Preview concept={c} />
              </Link>
              <div className="cv-card__text">
                <p className="cv-card__no">
                  {t(copy.option)} {c.index} · {t(c.world)}
                </p>
                <h2 lang="en" dir="ltr">
                  {c.name}
                </h2>
                <p className="cv-card__idea">{t(c.idea)}</p>
                <dl className="cv-card__facts">
                  <div>
                    <dt>{t(copy.speaksTo)}</dt>
                    <dd>{t(c.speaksTo)}</dd>
                  </div>
                  <div>
                    <dt>{t(copy.signature)}</dt>
                    <dd>{t(c.signature)}</dd>
                  </div>
                </dl>
                <div className="cv-card__foot">
                  <ul className="cv-card__swatches" aria-hidden="true">
                    {c.swatches.map((s) => (
                      <li key={s} style={{ background: s }} />
                    ))}
                  </ul>
                  <Link to={`/${c.slug}`} className="cv-btn">
                    {t(copy.open)} <span lang="en">{c.name}</span>
                    <span aria-hidden="true" className="cv-btn__arrow">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="cv-shared" aria-labelledby="cv-shared-title">
          <h2 id="cv-shared-title">{t(copy.sharedTitle)}</h2>
          <dl>
            {shared.map((s) => (
              <div key={s.title.en}>
                <dt>{t(s.title)}</dt>
                <dd>{t(s.text)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="cv-foot">
        <p>{t(copy.foot)}</p>
      </footer>
    </div>
  );
}
