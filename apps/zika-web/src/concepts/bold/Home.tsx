import { Link } from 'react-router-dom';
import {
  brand,
  catalog,
  categories,
  certifications,
  college,
  featuredProducts,
  formatIls,
  greenSeries,
  industries,
  international,
  knowledge,
  migatronic,
  photos,
  story,
  z11,
} from '../../content/index.ts';
import { ContactBlock, Layout, QuickStrip, SearchBox, asset } from './shared.tsx';

const offeringCards = [
  { title: 'אלקטרודות לריתוך', body: 'משפחת מוצרי הליבה של זיקה לכל עבודת מבנים, צנרת ומיכלים.', image: photos.sparks.src, href: categories[0].href },
  { title: 'מכונות וציוד', body: 'מכונות ריתוך, אינוורטרים וציוד משלים לעבודה מקצועית.', image: photos.sparksWarm.src, href: categories[5].href },
  { title: 'ידע והדרכה', body: 'קטלוגים, סרטוני הדרכה ומכללה מקצועית לריתוך.', image: college.image, href: knowledge[1].href },
] as const;

const resources = [
  { title: 'סרטוני הדרכה', body: 'ספר הדרכה טכני עם סרטונים לבחירת תהליך ועבודה נכונה.', image: asset('banner-videos.png'), href: knowledge[1].href },
  { title: 'PANOR W', body: featuredProducts[0].pitch, image: asset('banner-panoramic.png'), href: featuredProducts[0].href },
  { title: migatronic.name, body: migatronic.line, image: migatronic.catalogImage, href: migatronic.href },
  { title: catalog.title, body: 'הורדת קטלוג זיקה החדש למוצרים, תקנים ומשפחות ריתוך.', image: catalog.image, href: catalog.href },
] as const;

const popularSearches = [
  { label: 'אלקטרודות', href: categories[0].href, internal: false },
  { label: 'Z-11', href: '/bold/product/z-11', internal: true },
  { label: 'רתכת 160A', href: featuredProducts[1].href, internal: false },
  { label: 'קטלוג 2026', href: catalog.href, internal: false },
] as const;

export function Home() {
  return (
    <Layout page="home">
      <section className="c-bold__hero">
        <img src={photos.hero.src} alt="רתך עם קסדה וקשת ריתוך במפעל" width={photos.hero.w} height={photos.hero.h} />
        <div className="c-bold__hero-inner">
          <div className="c-bold__hero-copy">
            <h1>{brand.tagline}</h1>
            <p>
              זיקה תעשיות מייצרת בישראל מוצרי ריתוך מאז <bdi>{brand.founded}</bdi> — אלקטרודות, מכונות, ציוד בטיחות וידע מקצועי במקום אחד.
            </p>
            <div className="c-bold__cta-row">
              <a className="c-bold__primary" href={catalog.href}>
                קטלוג מוצרים
              </a>
              <Link className="c-bold__secondary" to="/bold/product/z-11">
                מעבר ל-Z-11
              </Link>
            </div>
          </div>
        </div>
        <QuickStrip />
      </section>

      <div className="c-bold__hero-search-wrap">
        <section className="c-bold__hero-search" aria-label="חיפוש מוצרים">
          <div className="c-bold__search-title">מה אתם מחפשים?</div>
          <div className="c-bold__search-tools">
            <SearchBox />
            <div className="c-bold__chips" aria-label="חיפושים נפוצים">
              {popularSearches.map((item) =>
                item.internal ? (
                  <Link className="c-bold__chip" key={item.label} to={item.href}>
                    {item.label}
                  </Link>
                ) : (
                  <a className="c-bold__chip" key={item.label} href={item.href}>
                    {item.label}
                  </a>
                ),
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="c-bold__section c-bold__section--tight">
        <div className="c-bold__section-head">
          <h2>קטגוריות מוצרים</h2>
          <p>גישה מהירה למשפחות המוצרים המרכזיות, בתנועה אופקית כמו מדף קטגוריות של מותג בינלאומי.</p>
        </div>
        <div className="c-bold__category-rail" aria-label="קטגוריות מוצרים">
          {categories.map((category) => (
            <a className="c-bold__category" key={category.id} href={category.href}>
              <img src={category.image} alt="" width="195" height="134" loading="lazy" />
              <span>{category.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="c-bold__section">
        <div className="c-bold__section-head">
          <h2>היצע מוצרים מוביל</h2>
          <p>שלוש כניסות גדולות: מוצרי הליבה, מכונות, והידע שמחזיק את המותג.</p>
        </div>
        <div className="c-bold__offerings">
          {offeringCards.map((card) => (
            <a className="c-bold__offering" key={card.title} href={card.href}>
              <img src={card.image} alt="" loading="lazy" />
              <div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="c-bold__shelf">
        <div className="c-bold__section">
          <div className="c-bold__section-head">
            <h2>מוצרים מובילים</h2>
            <p>מדף מוצרים בהיר עם תיאור קצר ועובדות שימושיות — בלי להעמיס על הבית.</p>
          </div>
          <div className="c-bold__product-grid">
            <Link className="c-bold__product-card c-bold__z11-card" to="/bold/product/z-11">
              <img src={z11.image} alt="אריזת Z-11" width="572" height="466" loading="lazy" />
              <div>
                <h3>{z11.name}</h3>
                <p>
                  {z11.oneLiner} החל מ-{formatIls(Math.min(...z11.variants.map((variant) => variant.priceIls)))}.
                </p>
                <ul>
                  <li>
                    <bdi>{z11.awsShort}</bdi>
                  </li>
                  <li>{z11.positions}</li>
                </ul>
              </div>
            </Link>
            {featuredProducts.map((product) => (
              <a className="c-bold__product-card" key={product.id} href={product.href}>
                <img src={product.image} alt={product.name} loading="lazy" />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.pitch}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="c-bold__section c-bold__about">
        <div className="c-bold__about-copy">
          <h2>יצרן ישראלי, תקנים בינלאומיים</h2>
          <p>{story.profile}</p>
          <p>{story.global}</p>
          <p>{story.sales}</p>
        </div>
        <div className="c-bold__trust">
          <div className="c-bold__trust-card">
            <strong>איכות ותקנים</strong>
            <p>{story.standardsMark}</p>
            <p>
              {certifications.process.join(' · ')} · {certifications.thirdParty.join(' · ')}
            </p>
          </div>
          <div className="c-bold__trust-card">
            <strong>תעשיות</strong>
            <ul>
              {industries.slice(0, 6).map((industry) => (
                <li key={industry}>{industry}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="c-bold__section">
        <div className="c-bold__section-head">
          <h2>מוצרים נבחרים ומשאבים</h2>
          <p>שורת התוכן המוכרת מהאתר הקיים — מלוטשת, ברורה וקרובה יותר לפעולה.</p>
        </div>
        <div className="c-bold__resources">
          {resources.map((resource) => (
            <a className="c-bold__resource" key={resource.title} href={resource.href}>
              <div className="c-bold__resource-media">
                <img src={resource.image} alt="" loading="lazy" />
              </div>
              <div className="c-bold__resource-body">
                <h3>{resource.title}</h3>
                <p>{resource.body}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="c-bold__section c-bold__compact">
        <a className="c-bold__feature-band" href={greenSeries.url}>
          <img src={greenSeries.image} alt="" loading="lazy" />
          <div>
            <h3>{greenSeries.name}</h3>
            <p>{greenSeries.claim}</p>
          </div>
        </a>
        <a className="c-bold__feature-band" href={college.href}>
          <img src={college.image} alt="" loading="lazy" />
          <div>
            <h3>{college.name}</h3>
            <p>{college.tracksLine}</p>
          </div>
        </a>
        <a className="c-bold__feature-band" href={international.url}>
          <img src={international.map} alt="" loading="lazy" />
          <div>
            <h3>{international.headline}</h3>
            <p>פעילות עסקית ביותר מ-<bdi>{international.countryCount}</bdi> מדינות.</p>
          </div>
        </a>
      </section>

      <ContactBlock />
    </Layout>
  );
}
