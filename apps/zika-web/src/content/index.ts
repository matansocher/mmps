// Every fact and price here was taken from zika.co.il / shop.zika.co.il. Do not add claims that are not in this file.

export const asset = (name: string): string => `${import.meta.env.BASE_URL}assets/${name}`;

export const ZIKA_SITE = 'https://www.zika.co.il';
export const SHOP_URL = 'https://shop.zika.co.il';

export const brand = {
  name: 'זיקה',
  legalName: 'זיקה תעשיות',
  latinName: 'ZIKA',
  signature: 'WELD·DONE',
  tagline: 'לעולם ריתוך בריא ומקצועי יותר',
  founded: 1950,
  phone: '04-9851820',
  phoneHref: 'tel:+97249851820',
  fax: '04-9851870',
  email: 'sales@zika.co.il',
  logos: {
    mark: asset('logo-mark.png'), // 80x68, black square background
    wordmark: asset('logo-text.png'), // 244x65, transparent, light text
    stacked: asset('logo-footer.png'), // 103x140, transparent, stacked mark + WELD·DONE
  },
  social: {
    facebook: 'https://www.facebook.com/%D7%96%D7%99%D7%A7%D7%94-%D7%91%D7%A2%D7%9E-1275261562490285/',
    youtube: 'https://www.youtube.com/channel/UC3lsBbO_z01gdWWBTDG49qQ',
    linkedin: 'https://www.linkedin.com/company/zika-welding-solutions',
  },
  languages: [
    { code: 'en', label: 'English', href: 'https://www.zika-welding.com/' },
    { code: 'fr', label: 'Français', href: 'https://www.zika-welding.com/fr/' },
  ],
  accessibilityStatement: 'https://shop.zika.co.il/accessibility-statement/',
} as const;

export const story = {
  profile:
    'זיקה תעשיות נוסדה בשנת 1950 והינה החברה היצרנית היחידה בארץ למוצרי ריתוך, תוך שימת דגש, הקפדה וגאווה על ייצור "כחול-לבן".',
  standardsMark: 'תוצרת המפעל היא היחידה המורשית לשאת את תו התקן של מכון התקנים הישראלי.',
  global: 'יצרנית מובילה של אלקטרודות וחוטי ריתוך העונים לדרישות התעשייה ברחבי העולם, לפי התקנים הישראליים והבינלאומיים.',
  rnd: 'לב החברה הוא מחלקת הפיתוח והמחקר, שכל כולה מוקדשת לשיפור מוצרים קיימים ולפיתוח מוצרים חדשים לפי סטנדרטים בינלאומיים.',
  lab: 'צוותים מיומנים של מהנדסים, טכנאים, מנהלים ופועלי ייצור, לצד מעבדה מתקדמת, זמינים לשרת, לתמוך, לייעץ ולספק מוצרים אמינים וזמינים בכל עת.',
  qa: 'מחלקת אבטחת האיכות מפקחת ובודקת בקפדנות בלתי מתפשרת את כלל מוצרי החברה.',
  sales: 'צוות המכירות מגובה במהנדסים, כדי לעזור ללקוח להגדיר את הפתרון האופטימלי והחסכוני לבעיה הטכנית בעבודה שלו.',
} as const;

export const certifications = {
  // Process approvals
  process: ['מכון התקנים הישראלי', 'EN ISO 9001:2008', 'IQNET', 'CE'],
  // Product standards
  standards: ['AWS', 'EN', 'CE'],
  // Third-party inspection approvals
  thirdParty: ['BV', 'LR', 'GL', 'ABS', 'TÜV'],
  certificatesUrl: `${ZIKA_SITE}/%d7%aa%d7%a2%d7%95%d7%93%d7%95%d7%aa-%d7%90%d7%99%d7%9b%d7%95%d7%aa-%d7%95%d7%94%d7%99%d7%aa%d7%a8%d7%99%d7%9d/`,
} as const;

export const industries = [
  'מספנות ימיות',
  'יצרני ציוד ותיקונים',
  'מיכלי לחץ ומיכליות',
  'קבלני בניין',
  'צנרת ותשתיות',
  'ציוד הנדסי כבד',
  'חברות קונסטרוקציה',
  'תעשיות ביטחוניות',
  'חשמל ואנרגיה',
  'פטרוכימיה, נפט וגז',
] as const;

export const international = {
  headline: 'פעילות עסקית ביותר מ-35 מדינות',
  countryCount: 37,
  regions: [
    {
      name: 'אירופה',
      countries: ['בולגריה', 'קפריסין', 'גרמניה', 'בלגיה', 'סרביה', 'רומניה', 'קרואטיה', 'הולנד', 'פולין', 'דנמרק', 'שוודיה', 'הונגריה', 'צרפת', 'בריטניה', 'שווייץ', 'פורטוגל', 'יוון', 'איטליה', 'מלטה', 'ליטא', 'סלובניה', 'סלובקיה'],
    },
    { name: 'אסיה', countries: ['קזחסטן', 'ישראל', 'ארמניה', 'תאילנד', 'סינגפור', 'הפיליפינים', 'דרום קוריאה'] },
    { name: 'צפון אמריקה', countries: ['ארה"ב', 'קנדה', 'גואטמלה'] },
    { name: 'דרום אמריקה', countries: ['ארגנטינה'] },
    { name: 'אפריקה', countries: ['גאנה', 'אוגנדה'] },
    { name: 'אוסטרליה', countries: ['אוסטרליה', 'ניו זילנד'] },
  ],
  map: asset('world-map.png'), // 920x730, white bg, gold = active countries, includes a Latin country list on top
  url: `${ZIKA_SITE}/%d7%a4%d7%a2%d7%99%d7%9c%d7%95%d7%aa-%d7%91%d7%99%d7%9f-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/`,
} as const;

export const greenSeries = {
  name: 'הסדרה הירוקה',
  claim: 'פטנט עולמי מבית זיקה',
  body: 'אלקטרודות בציפוי בנוסחה ייחודית לפליטה מופחתת של נדפי מנגן: מתכת רתך עם תכולת מנגן נמוכה משמעותית, שמורידה באופן דרמטי את המנגן בעשן הריתוך ועומדת בתקנות הגיהות התעסוקתית.',
  products: ['Z-11 LMn · E 6013', 'Z-4 LMn · E 7018', 'Z-610 LMn · E 6010'],
  image: asset('home-recovered.png'), // 959x345 banner with baked Hebrew text on the right; green left side
  url: `${ZIKA_SITE}/catalog/low-mn-electrodes/`,
} as const;

export type Category = {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly image: string;
  readonly href: string;
};

export const categories: readonly Category[] = [
  { id: 'electrodes', name: 'אלקטרודות לריתוך', short: 'אלקטרודות', image: asset('cat-electrodes.jpg'), href: `${ZIKA_SITE}/catalog/%d7%90%d7%9c%d7%a7%d7%98%d7%a8%d7%95%d7%93%d7%95%d7%aa-%d7%9c%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%95%d7%97%d7%99%d7%aa%d7%95%d7%9a/` },
  { id: 'mig', name: 'ריתוך בחוטים רציפים (MIG)', short: 'MIG', image: asset('cat-mig.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%91%d7%97%d7%95%d7%98%d7%99%d7%9d-%d7%a8%d7%a6%d7%99%d7%a4%d7%99%d7%9d-mig/` },
  { id: 'tig', name: 'ריתוך בגיבוי גז ארגון (TIG)', short: 'TIG', image: asset('cat-stainless.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%91%d7%92%d7%99%d7%91%d7%95%d7%99-%d7%92%d7%96-%d7%90%d7%a8%d7%92%d7%95%d7%9f-tig/` },
  { id: 'saw', name: 'ריתוך בקשת מכוסה', short: 'קשת מכוסה', image: asset('cat-saw.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%91%d7%a7%d7%a9%d7%aa-%d7%9e%d7%9b%d7%95%d7%a1%d7%94/` },
  { id: 'soldering', name: 'ריתוך בלהבה והלחמות', short: 'להבה והלחמות', image: asset('cat-soldering.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%91%d7%9c%d7%94%d7%91%d7%94-%d7%95%d7%94%d7%9c%d7%97%d7%9e%d7%95%d7%aa/` },
  { id: 'machines', name: 'מכונות ריתוך וחיתוך', short: 'מכונות', image: asset('cat-machines.jpg'), href: `${ZIKA_SITE}/catalog/%d7%9e%d7%9b%d7%95%d7%a0%d7%95%d7%aa-%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%97%d7%99%d7%aa%d7%95%d7%9a/` },
  { id: 'safety', name: 'ציוד בטיחות', short: 'בטיחות', image: asset('cat-safety.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a6%d7%99%d7%95%d7%93-%d7%91%d7%98%d7%99%d7%97%d7%95%d7%aa-%d7%95%d7%a6%d7%99%d7%95%d7%93-%d7%a8%d7%a4%d7%95%d7%90%d7%99/` },
  { id: 'abrasives', name: 'מוצרי השחזה וליטוש', short: 'השחזה וליטוש', image: asset('cat-discs.jpg'), href: `${ZIKA_SITE}/catalog/%d7%9e%d7%95%d7%a6%d7%a8%d7%99-%d7%94%d7%a9%d7%97%d7%96%d7%94-%d7%95%d7%9c%d7%99%d7%98%d7%95%d7%a9/` },
  { id: 'accessories', name: 'ציוד משלים לריתוך', short: 'ציוד משלים', image: asset('cat-hard-facing.jpg'), href: `${ZIKA_SITE}/catalog/%d7%a6%d7%99%d7%95%d7%93-%d7%9e%d7%a9%d7%9c%d7%99%d7%9d-%d7%9c%d7%a8%d7%99%d7%aa%d7%95%d7%9a/` },
];

export type FeaturedProduct = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly pitch: string;
  readonly facts: readonly string[];
  readonly image: string;
  readonly href: string;
};

export const featuredProducts: readonly FeaturedProduct[] = [
  {
    id: 'panor-w',
    name: 'PANOR W',
    kind: 'מסכת ריתוך פנורמית עם לד',
    pitch: 'מסכה סולארית שמתכהה אוטומטית ומאפשרת לראות קשת צבעים מלאה בזמן ריתוך, ולא רק גווני ירוק.',
    facts: ['זווית ראייה 180°', 'מעבר לחושך תוך פחות מ-1/10,000 שנייה', '7 סנסורים', '610 גרם', 'שנתיים אחריות'],
    image: asset('panor-w.jpg'), // 343x417, white bg
    href: `${ZIKA_SITE}/product/panoramic/`,
  },
  {
    id: 'striker-1600',
    name: 'STRIKER 1600',
    kind: 'אינוורטר מקצועי חד-פאזי',
    pitch: 'רתכת 160 אמפר בעיצוב ייחודי של חברה ישראלית, שזכתה בפרס GOOD DESIGN®.',
    facts: ['16–160A', 'MMA + LIFT TIG', 'עובדת בנתיך 16A', '7.1 ק"ג', '3 שנות אחריות'],
    image: asset('striker-1600.png'), // 301x269, transparent
    href: `${ZIKA_SITE}/product/striker-1600/`,
  },
  {
    id: 'graffiti-160',
    name: 'GRAFFITI 160',
    kind: 'רתכת אלקטרודה עם צג דיגיטלי',
    pitch: 'אינוורטר נייד לעבודות ריתוך ומסגרות כלליות, במשקל 3.5 ק"ג בלבד.',
    facts: ['160A', 'צג דיגיטלי', '3.5 ק"ג', 'עבודה עם גנרטור 10KVA ומעלה', '12 חודשי אחריות'],
    image: asset('graffiti-160.jpg'), // 283x258, white bg
    href: `${ZIKA_SITE}/product/graffiti-160/`,
  },
];

export const migatronic = {
  name: 'Migatronic',
  line: 'זיקה היא המפיצה של מכונות הריתוך של Migatronic בישראל.',
  catalogImage: asset('banner-migatronic.jpg'),
  href: `${ZIKA_SITE}/migatronic-home/`,
} as const;

export const catalog = {
  title: 'קטלוג המוצרים 2026–2027',
  image: asset('banner-catalog-2026.jpg'), // 574x396, has baked Hebrew CTA text
  href: `${ZIKA_SITE}/miga-cat/`,
} as const;

export const college = {
  name: 'המכללה לריתוך',
  full: 'המכללה לריתוך – מרכז ההכשרות וההשמות',
  sponsorship: 'בחסות בלעדית של זיקה',
  body: 'מרכז ידע שבו לומדים, מתמקצעים ועוברים בחינת הסמכה לפי דרישות התקן. ניתן ללמוד פעם בשבוע, בבוקר, בערב או בימי שישי.',
  tracks: 27,
  tracksLine: '27 מסלולי הדרכת ריתוך הפועלים לפי WPS (מפרט תהליך ריתוך) עולמי מאושר',
  clients: ['מפעלי ים המלח', 'תנובה', 'אגד', 'רשות שדות התעופה', 'רכבת ישראל', 'מפעלי נשר'],
  audiences: ['הסמכת רתכים', 'מהנדסים ומפקחי ריתוך', 'חובבים בשעות הפנאי'],
  phone: '074-7030600',
  site: 'https://www.ltc.co.il',
  // college-crop.jpg is the watermark-free left part of the photo (760x800). Never use college.jpg uncropped: it carries a stock watermark on the right.
  image: asset('college-crop.jpg'),
  href: `${ZIKA_SITE}/%d7%94%d7%9e%d7%9b%d7%9c%d7%9c%d7%94-%d7%9c%d7%a8%d7%99%d7%aa%d7%95%d7%9a/`,
} as const;

export const knowledge = [
  { label: 'המדריך השלם לריתוך', href: `${ZIKA_SITE}/%d7%94%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%94%d7%a9%d7%9c%d7%9d-%d7%9c%d7%a8%d7%99%d7%aa%d7%95%d7%9a/` },
  { label: 'ספר הדרכה טכני (סרטוני הדרכה)', href: `${ZIKA_SITE}/video-tutorials/` },
  { label: 'כיצד לבחור רתכת', href: `${ZIKA_SITE}/%d7%9b%d7%99%d7%a6%d7%93-%d7%9c%d7%91%d7%97%d7%95%d7%a8-%d7%a8%d7%aa%d7%9b%d7%aa/` },
  { label: 'מדריך בטיחות בריתוך', href: `${ZIKA_SITE}/%d7%91%d7%98%d7%99%d7%97%d7%95%d7%aa-%d7%91%d7%a2%d7%91%d7%95%d7%93%d7%95%d7%aa-%d7%a8%d7%99%d7%aa%d7%95%d7%9a-%d7%95%d7%97%d7%99%d7%aa%d7%95%d7%9a-%d7%91%d7%a7%d7%a9%d7%aa-%d7%97%d7%a9%d7%9e%d7%9c/` },
  { label: 'ייבוש אלקטרודות', href: `${ZIKA_SITE}/%d7%99%d7%99%d7%91%d7%95%d7%a9-%d7%90%d7%9c%d7%a7%d7%98%d7%a8%d7%95%d7%93%d7%95%d7%aa/` },
  { label: 'ימי עיון', href: `${ZIKA_SITE}/%d7%99%d7%9e%d7%99-%d7%a2%d7%99%d7%95%d7%9f/` },
  { label: 'שאלות נפוצות', href: `${ZIKA_SITE}/%d7%a9%d7%90%d7%9c%d7%95%d7%aa-%d7%95%d7%aa%d7%a9%d7%95%d7%91%d7%95%d7%aa/` },
  { label: 'מאמרים', href: `${ZIKA_SITE}/%d7%9e%d7%90%d7%9e%d7%a8%d7%99%d7%9d-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99%d7%99%d7%9d/` },
] as const;

export const nav = [
  { label: 'קטלוג מוצרים', href: `${ZIKA_SITE}/%D7%A7%D7%98%D7%9C%D7%95%D7%92-%D7%9E%D7%95%D7%A6%D7%A8%D7%99%D7%9D/` },
  { label: 'חנות', href: SHOP_URL },
  { label: 'מכונות Migatronic', href: `${ZIKA_SITE}/migatronic-home/` },
  { label: 'ידע והדרכה', href: knowledge[0].href },
  { label: 'המכללה לריתוך', href: college.href },
  { label: 'אודות', href: `${ZIKA_SITE}/%d7%90%d7%95%d7%93%d7%95%d7%aa-%d7%96%d7%99%d7%a7%d7%94/` },
  { label: 'צור קשר', href: `${ZIKA_SITE}/%d7%a6%d7%95%d7%a8-%d7%a7%d7%a9%d7%a8/` },
] as const;

export const storesUrl = `${ZIKA_SITE}/zika-stores/`;
export const careersUrl = `${ZIKA_SITE}/%d7%a7%d7%a8%d7%99%d7%99%d7%a8%d7%94-%d7%91%d7%96%d7%99%d7%a7%d7%94/`;

export const contacts = [
  { dept: 'מחלקת מכירות', person: 'חן ברבן', phone: '04-9851805', email: 'sales@zika.co.il' },
  { dept: 'ייעוץ טכני', person: 'גבריאל קירשטיין', phone: '04-9851807', email: 'gabriel@zika.co.il' },
  { dept: 'מחלקת יצוא', person: 'איריס לב-ארי', phone: '04-9851833', email: 'iris@zika.co.il' },
] as const;

export const shopPromises = [
  { label: 'משלוח עד הבית', icon: asset('icon-01_delivery.png') },
  { label: 'תמיכה מקצועית', icon: asset('icon-02_support.png') },
  { label: 'אחריות יצרן', icon: asset('icon-03_warranty.png') },
  { label: 'תו תקן ישראלי', icon: asset('icon-04_standart.png') },
] as const;

// Photography. All are real zika.co.il assets; most are low resolution, so never display them larger than ~1.5x their native width.
export const photos = {
  hero: { src: asset('hero-home.jpg'), w: 2000, h: 754, note: 'Current hero. Black bg; Z-11 LMn packs + electrodes on the left third, welding helmet + arc on the right third. ZIKA + tagline text is baked into the center, so crop to a side (object-position) or cover the center.' },
  sparks: { src: asset('featured-main.jpg'), w: 689, h: 304, note: 'Welder grinding/cutting with a big orange spark fan, dark.' },
  sparksWarm: { src: asset('featured-main2.jpg'), w: 689, h: 304, note: 'Worn leather welding mask, golden bokeh sparks.' },
  welderPortrait: { src: asset('shop-1.jpg'), w: 313, h: 132, note: 'Small sepia portrait of a welder, tiny.' },
  factoryRods: { src: asset('about-1.jpg'), w: 689, h: 212, note: 'B&W: rows of electrodes on the production line (Zika factory).' },
  factoryLab: { src: asset('about-2.jpg'), w: 689, h: 212, note: 'B&W: Zika lab equipment (XEPOS analyzer, viscometer).' },
  factoryWarehouse: { src: asset('about-3.jpg'), w: 689, h: 212, note: 'B&W: Zika warehouse aisle with packed boxes.' },
  college: { src: asset('college-crop.jpg'), w: 760, h: 800, note: 'Sepia: welder in helmet welding at a bench, sparks. Watermark-free crop.' },
  electrodeLmn: { src: asset('electrode-lmn.jpg'), w: 325, h: 251, note: 'Low-Mn electrode product shot.' },
  mildSteel: { src: asset('mild-steel.jpg'), w: 301, h: 269, note: 'Mild-steel electrodes category image.' },
} as const;

// ---------- Z-11 product page ----------

export type Z11Variant = {
  readonly sku: string;
  readonly diameterMm: number;
  readonly diameterIn: string;
  readonly lengthMm: string;
  readonly currentA: string;
  readonly packKg: number;
  readonly priceIls: number;
  readonly packaging: 'פלסטיק' | 'קרטון';
};

export const z11 = {
  id: 'z-11',
  model: 'Z-11',
  name: 'Z-11 לריתוך מבנים',
  shopName: 'לריתוך מבנים Z11',
  type: 'אלקטרודה רוטילית',
  category: 'אלקטרודות רוטיליות',
  aws: 'AWS/ASME SFA A5.1: E 6013',
  awsShort: 'E 6013',
  iso: 'EN ISO 2560-A: E 42 0 RR 12',
  oneLiner: 'אלקטרודה בעלת ציפוי רוטילי לריתוך בכל המצבים.',
  description: [
    'אלקטרודה בעלת ציפוי רוטילי לריתוך בכל המצבים.',
    'לפלדות פחמניות בעלות חוזק קריעה עד 520 נ/ממ"ר.',
    'מתאימה לריתוך מבנים, צנורות, מיכלים וחלקי מכונות.',
    'התזה מועטת והסרת סיגים קלה.',
  ],
  applications: ['מבנים', 'צנרת', 'מיכלים', 'חלקי מכונות'],
  coating: 'רוטילי',
  current: 'AC, DC ±',
  positions: 'כל המצבים',
  preDrying: 'אין צורך',
  chemistry: [
    { el: 'C', name: 'פחמן', pct: '0.08' },
    { el: 'Mn', name: 'מנגן', pct: '0.50' },
    { el: 'Si', name: 'צורן', pct: '0.25' },
  ],
  mechanical: [
    { label: 'חוזק כניעה', value: '440', unit: 'נ/ממ"ר' },
    { label: 'חוזק מתיחה', value: '520', unit: 'נ/ממ"ר' },
    { label: 'התארכות יחסית', value: '26', unit: '%' },
    { label: 'חוזק נגיפה (שרפי V)', value: '70', unit: 'J @ 0°C' },
  ],
  variants: [
    { sku: 'Z11-16', diameterMm: 1.6, diameterIn: '1/16', lengthMm: '300', currentA: '50–70', packKg: 1.5, priceIls: 136, packaging: 'פלסטיק' },
    { sku: 'Z11-20', diameterMm: 2.0, diameterIn: '5/64', lengthMm: '300', currentA: '50–70', packKg: 2, priceIls: 101, packaging: 'פלסטיק' },
    { sku: 'Z11-25', diameterMm: 2.5, diameterIn: '3/32', lengthMm: '350', currentA: '60–100', packKg: 5, priceIls: 143, packaging: 'קרטון' },
    { sku: 'Z11-32', diameterMm: 3.25, diameterIn: '1/8', lengthMm: '350 / 450', currentA: '80–150', packKg: 5, priceIls: 118, packaging: 'קרטון' },
    { sku: 'Z11-40', diameterMm: 4.0, diameterIn: '5/32', lengthMm: '350 / 450', currentA: '140–200', packKg: 5, priceIls: 118, packaging: 'קרטון' },
  ] as readonly Z11Variant[],
  // 5.0 mm appears in the datasheet but is not sold in the online shop.
  datasheetOnly: { diameterMm: 5.0, diameterIn: '3/16', lengthMm: '350 / 450', currentA: '180–260' },
  packagingNote: 'קטרים 1.6 ו-2.0 מ"מ מגיעים באריזת פלסטיק; 2.5 מ"מ ומעלה באריזת קרטון.',
  shipping: { label: 'משלוח ע"י רשות הדואר', priceIls: 53 },
  image: asset('z11-pack.png'), // 572x466, transparent: kraft/red/navy ZIKA carton + red plastic tube
  datasheetPdf: `${ZIKA_SITE}/wp-content/uploads/2016/06/Z11_2016.pdf`,
  lowMnPdf: `${ZIKA_SITE}/wp-content/uploads/2019/10/Z11-LMn-2019.pdf`,
  shopUrl: `${SHOP_URL}/product/z-11/`,
  siteUrl: `${ZIKA_SITE}/product/z-11/`,
  family: [
    { model: 'Z-26', aws: 'E 6013', use: 'לריתוך פחים דקים', price: '₪118–₪143', image: asset('z26-pack.png'), href: `${ZIKA_SITE}/product/z-26/` },
    { model: 'Z-6', aws: 'E 6013', use: 'לריתוך חלקים מגולוונים', price: '₪118–₪143', image: asset('z6-pack.png'), href: `${ZIKA_SITE}/product/z-6/` },
    { model: 'Z-9', aws: 'E 6013', use: 'אלקטרודה רוטילית', price: null, image: null, href: `${ZIKA_SITE}/product/z-9/` },
    { model: 'Z-5', aws: 'E 6012', use: 'אלקטרודה רוטילית', price: null, image: null, href: `${ZIKA_SITE}/product/z-5/` },
  ],
  lowMnSibling: {
    model: 'Z-11 LMn',
    line: 'אותה אלקטרודה, בנוסחת "הסדרה הירוקה" לפליטה מופחתת של נדפי מנגן.',
    href: `${ZIKA_SITE}/product/zika-11-lmn-e-6013-%d7%a0%d7%93%d7%a4%d7%99-%d7%9e%d7%a0%d7%92%d7%9f-%d7%9e%d7%95%d7%a4%d7%97%d7%aa%d7%99%d7%9d/`,
  },
} as const;

export const formatIls = (n: number): string => `₪${n.toLocaleString('he-IL')}`;

export const quoteMailto = (lines: readonly string[]): string =>
  `mailto:${brand.email}?subject=${encodeURIComponent('בקשת הצעת מחיר – Z-11')}&body=${encodeURIComponent(lines.join('\n'))}`;
