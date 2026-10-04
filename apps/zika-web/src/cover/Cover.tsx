import { Link } from 'react-router-dom';
import { asset, brand, ZIKA_SITE } from '../content/index.ts';
import { concepts } from '../lib/concepts.ts';
import { useFonts } from '../lib/useFonts.ts';
import './cover.css';

const shared = [
  { title: 'תוכן אמיתי בלבד', text: 'כל טקסט, תקן, מחיר ותמונה לקוחים מהאתר ומהחנות הקיימים של זיקה. אין טענות שיווקיות חדשות.' },
  { title: 'מהאתר לקנייה בלי לעבור אתר', text: 'בכל קונספט אפשר לבחור קוטר, להוסיף לסל ולהמשיך לתשלום – במקום לקפוץ בין zika.co.il לחנות הנפרדת.' },
  { title: 'נבנה קודם לנייד', text: 'רוב הגלישה מגיעה מטלפון. כל עמוד נבדק במסך צר לפני מסך רחב, בעברית ומימין לשמאל.' },
  { title: 'נגיש ומהיר', text: 'ניגודיות AA, ניווט מקלדת, כבוד להעדפת "פחות תנועה", ותמונות במשקל קל.' },
];

export function Cover() {
  useFonts('https://fonts.googleapis.com/css2?family=Alef:wght@400;700&display=swap');

  return (
    <div className="cv">
      <header className="cv-top">
        <a href={ZIKA_SITE} className="cv-top__brand" aria-label="זיקה – לאתר הנוכחי">
          <img src={asset('logo-mark.png')} alt="" width={40} height={34} />
          <span>{brand.name}</span>
        </a>
        <span className="cv-top__meta">הצעה לעיצוב מחדש · מצגת להנהלה</span>
      </header>

      <main>
        <section className="cv-intro" aria-labelledby="cv-title">
          <h1 id="cv-title">
            ארבע גרסאות מלוטשות <br />
            לאתר של זיקה.
          </h1>
          <div className="cv-intro__body">
            <p>
              מאז {brand.founded} זיקה מייצרת בישראל את מה שרתכים סומכים עליו. האתר הנוכחי לא מספר את זה: הוא נראה מיושן, קשה לשימוש בנייד, והקנייה בו מתבצעת באתר חנות נפרד.
            </p>
            <p>
              בדקנו את האתרים של יצרניות הריתוך המובילות בעולם – Lincoln Electric, ESAB, Miller, Böhler, Hobart ו-Migatronic – ולקחנו מכל אחד את מה שעובד הכי טוב. לפניכם ארבע גרסאות, כל אחת עם <strong>דף בית</strong> שמהדק את האתר הקיים ו<strong>דף מוצר</strong> של אלקטרודת Z‑11 עם סל קניות פעיל. אותו תוכן, אותם מחירים ואותן תמונות.
            </p>
          </div>
        </section>

        <section className="cv-list" aria-label="הקונספטים">
          {concepts.map((c) => (
            <article key={c.slug} className="cv-card" style={{ ['--a' as string]: c.swatches[0], ['--b' as string]: c.swatches[1], ['--c' as string]: c.swatches[2] }}>
              <Link to={`/${c.slug}`} className="cv-card__visual" aria-label={`פתיחת קונספט ${c.index}: ${c.hebrewName}`} tabIndex={-1}>
                <img src={asset(c.preview)} alt="" loading="lazy" width={1440} height={900} />
                <span className="cv-card__no">אפשרות {c.index}</span>
              </Link>
              <div className="cv-card__text">
                <h2>
                  {c.hebrewName}
                  <span lang="en" dir="ltr">
                    {c.name}
                  </span>
                </h2>
                <p className="cv-card__idea">{c.idea}</p>
                <div className="cv-card__inspo">
                  <span>מה לקחנו מהמתחרים:</span>
                  <ul>
                    {c.inspiredBy.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
                <p className="cv-card__for">
                  <span>מתאים במיוחד ל:</span> {c.bestFor}
                </p>
                <ul className="cv-card__why">
                  {c.whyClients.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <div className="cv-card__actions">
                  <Link to={`/${c.slug}`} className="cv-btn cv-btn--primary">
                    לדף הבית
                  </Link>
                  <Link to={`/${c.slug}/product/z-11`} className="cv-btn">
                    לדף המוצר Z‑11
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="cv-shared" aria-labelledby="cv-shared-title">
          <h2 id="cv-shared-title">מה משותף לכל הגרסאות</h2>
          <dl>
            {shared.map((s) => (
              <div key={s.title}>
                <dt>{s.title}</dt>
                <dd>{s.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="cv-foot">
        <p>הדגמה פנימית. המחירים והמפרטים נלקחו מ-shop.zika.co.il ומ-zika.co.il. הקנייה עצמה ממשיכה לחנות הקיימת.</p>
      </footer>
    </div>
  );
}
