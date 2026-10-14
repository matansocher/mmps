import { bi, type Bi } from '../lib/i18n.tsx';

// Real, citable industry figures. Keep `source` accurate if you edit a value.
export type Stat = {
  readonly value: Bi;
  readonly label: Bi;
  readonly source: string;
  readonly url: string;
};

export const stats: readonly Stat[] = [
  {
    value: bi('$308.6B', '308.6 מיליארד $'),
    label: bi('lost to insurance fraud in the US every year, across all lines', 'אובדים בכל שנה להונאות ביטוח בארה״ב, בכל הענפים'),
    source: 'Coalition Against Insurance Fraud, 2022',
    url: 'https://insurancefraud.org/fraud-stats/',
  },
  {
    value: bi('$40B', '40 מיליארד $'),
    label: bi('a year in non-health insurance fraud alone', 'בשנה בהונאות ביטוח שאינן ביטוח בריאות בלבד'),
    source: 'FBI',
    url: 'https://www.fbi.gov/stats-services/publications/insurance-fraud',
  },
  {
    value: bi('$400–700', '400–700 $'),
    label: bi('added to the average family’s premiums each year because of it', 'מתווספים בכל שנה לפרמיה של משפחה ממוצעת בגלל זה'),
    source: 'FBI',
    url: 'https://www.fbi.gov/stats-services/publications/insurance-fraud',
  },
  {
    value: bi('~10%', '~10%'),
    label: bi('of property-casualty losses and adjustment expenses are fraud', 'מההפסדים והוצאות יישוב התביעות בביטוח כללי הם הונאה'),
    source: 'Insurance Information Institute',
    url: 'https://www.iii.org/article/background-on-insurance-fraud',
  },
];

export type Pain = { readonly title: Bi; readonly text: Bi };

export const pains: readonly Pain[] = [
  {
    title: bi('A forged receipt looks exactly like a real one', 'קבלה מזויפת נראית בדיוק כמו אמיתית'),
    text: bi(
      'Editing a total from 450 to 1,450 takes a phone app and thirty seconds. Your adjusters see a PDF and a stamp. They can’t see the pixels.',
      'לשנות סכום מ-450 ל-1,450 לוקח אפליקציה בטלפון ושלושים שניות. השמאים שלכם רואים PDF וחותמת. את הפיקסלים הם לא רואים.',
    ),
  },
  {
    title: bi('Investigations start after the money is gone', 'החקירה מתחילה אחרי שהכסף כבר יצא'),
    text: bi(
      'Most fraud is found in audits, tips and recoveries, months after payout. By then, recovery is slow, expensive and often impossible.',
      'רוב ההונאות מתגלות בביקורות, בהלשנות ובתביעות השבה, חודשים אחרי התשלום. אז ההשבה איטית, יקרה ולרוב בלתי אפשרית.',
    ),
  },
  {
    title: bi('Honest customers pay for it twice', 'הלקוחות הישרים משלמים על זה פעמיים'),
    text: bi(
      'Once in higher premiums, and again in waiting: when you can’t tell who is lying, everyone gets the same slow review.',
      'פעם אחת בפרמיה גבוהה יותר, ופעם שנייה בהמתנה: כשאי אפשר לדעת מי משקר, כולם עוברים את אותה בדיקה איטית.',
    ),
  },
  {
    title: bi('Rings recycle the same evidence', 'רשתות ממחזרות את אותן ראיות'),
    text: bi(
      'The same clinic stamp, the same dented bumper photo, filed under different names. No human can remember every document they’ve seen.',
      'אותה חותמת מרפאה, אותה תמונה של פגוש מעוך, מוגשות בשמות שונים. אף אדם לא יכול לזכור כל מסמך שעבר מולו.',
    ),
  },
];

export type Check = { readonly key: string; readonly title: Bi; readonly text: Bi; readonly example: Bi };

export const checks: readonly Check[] = [
  {
    key: 'pixels',
    title: bi('Pixel-level tampering', 'זיוף ברמת הפיקסל'),
    text: bi('Finds digits, names and dates that were pasted, retyped or re-compressed after the document was created.', 'מאתר ספרות, שמות ותאריכים שהודבקו, הוקלדו מחדש או נדחסו מחדש אחרי שהמסמך נוצר.'),
    example: bi('“1” inserted before “450” in a different font', '״1״ שנוסף לפני ״450״ בגופן אחר'),
  },
  {
    key: 'metadata',
    title: bi('File and photo metadata', 'מטא-דאטה של קבצים ותמונות'),
    text: bi('Reads creation dates, devices, editing software and GPS, and compares them with what the claim says.', 'קורא תאריכי יצירה, מכשירים, תוכנות עריכה ומיקום, ומשווה אותם למה שנטען בתביעה.'),
    example: bi('Photo “taken at the scene” was shot two weeks earlier', 'תמונה ״מזירת האירוע״ צולמה שבועיים קודם'),
  },
  {
    key: 'duplicates',
    title: bi('Reused evidence across claims', 'ראיות שחוזרות בין תביעות'),
    text: bi('Matches every image, stamp and signature against your full claims history, including near-duplicates and crops.', 'משווה כל תמונה, חותמת וחתימה מול כל היסטוריית התביעות שלכם, כולל העתקים חלקיים וחיתוכים.'),
    example: bi('Same clinic stamp on three claims, three policyholders', 'אותה חותמת מרפאה בשלוש תביעות של שלושה מבוטחים'),
  },
  {
    key: 'registry',
    title: bi('Provider and registry checks', 'בדיקת ספקים ומרשמים'),
    text: bi('Verifies clinics, doctors, garages and license numbers against public registries and your provider network.', 'מאמת מרפאות, רופאים, מוסכים ומספרי רישיון מול מרשמים ציבוריים ומול רשת הספקים שלכם.'),
    example: bi('License number belongs to a different doctor', 'מספר הרישיון שייך לרופא אחר'),
  },
  {
    key: 'context',
    title: bi('Context and plausibility', 'הקשר וסבירות'),
    text: bi('Checks opening hours, holidays, typical fees and treatment patterns, so the story has to add up, not just the paper.', 'בודק שעות פעילות, חגים, תעריפים מקובלים ודפוסי טיפול, כך שהסיפור צריך להסתדר, לא רק הנייר.'),
    example: bi('Visit dated on a Saturday the clinic is closed', 'ביקור בתאריך של שבת, כשהמרפאה סגורה'),
  },
  {
    key: 'photos',
    title: bi('Damage and injury photos', 'תמונות נזק ופציעה'),
    text: bi('Spots stock images, AI-generated pictures, staged damage and photos lifted from the web.', 'מזהה תמונות מאגר, תמונות שנוצרו ב-AI, נזק מבוים ותמונות שנלקחו מהרשת.'),
    example: bi('“Hail damage” photo found on a car-sales site', 'תמונת ״נזק מברד״ שנמצאה באתר מכירת רכבים'),
  },
];

export type Step = { readonly title: Bi; readonly text: Bi };

export const steps: readonly Step[] = [
  {
    title: bi('Connect', 'מתחברים'),
    text: bi('Documents flow in from your claims system, app or email intake. No change for customers or adjusters.', 'המסמכים זורמים ממערכת התביעות, מהאפליקציה או מתיבת הדואר. בלי שינוי ללקוחות או לשמאים.'),
  },
  {
    title: bi('Analyze', 'מנתחים'),
    text: bi('Every receipt, photo and form is examined in seconds, against the document itself and everything you’ve seen before.', 'כל קבלה, תמונה וטופס נבדקים תוך שניות, מול המסמך עצמו ומול כל מה שראיתם בעבר.'),
  },
  {
    title: bi('Explain', 'מסבירים'),
    text: bi('Each flag comes with the evidence: the altered digit, the reused stamp, the registry mismatch. No black box.', 'כל התרעה מגיעה עם הראיה: הספרה ששונתה, החותמת שחזרה, אי-ההתאמה במרשם. בלי קופסה שחורה.'),
  },
  {
    title: bi('Decide', 'מחליטים'),
    text: bi('Clean claims are fast-tracked. Risky ones go to your investigators with the case already built. People make the call.', 'תביעות נקיות עוברות למסלול מהיר. חשודות עוברות לחוקרים עם תיק מוכן. ההחלטה נשארת אצל אנשים.'),
  },
];

export type Principle = { readonly title: Bi; readonly text: Bi };

export const principles: readonly Principle[] = [
  {
    title: bi('People decide, always', 'אנשים מחליטים, תמיד'),
    text: bi('The AI never denies a claim. It recommends, shows its evidence, and your team makes the decision.', 'ה-AI אף פעם לא דוחה תביעה. הוא ממליץ, מציג ראיות, והצוות שלכם מחליט.'),
  },
  {
    title: bi('Every flag is explainable', 'כל התרעה ניתנת להסבר'),
    text: bi('Evidence an adjuster can read, a regulator can audit and a court can follow.', 'ראיות ששמאי יכול לקרוא, רגולטור יכול לבקר ובית משפט יכול לעקוב אחריהן.'),
  },
  {
    title: bi('Your data stays yours', 'המידע שלכם נשאר שלכם'),
    text: bi('Encrypted end to end, deployable in your region or your cloud, with a full audit trail and role-based access.', 'מוצפן מקצה לקצה, ניתן להתקנה באזור שלכם או בענן שלכם, עם תיעוד מלא והרשאות לפי תפקיד.'),
  },
];

export type Faq = { readonly q: Bi; readonly a: Bi };

export const faqs: readonly Faq[] = [
  {
    q: bi('Will the AI reject claims on its own?', 'האם ה-AI ידחה תביעות בעצמו?'),
    a: bi('No. It scores and explains. Clean claims can be fast-tracked by your rules; anything risky goes to a person with the evidence attached.', 'לא. הוא נותן ציון ומסביר. תביעות נקיות יכולות לעבור למסלול מהיר לפי הכללים שלכם, וכל דבר חשוד עובר לאדם עם הראיות.'),
  },
  {
    q: bi('What if a genuine customer gets flagged?', 'ומה אם לקוח אמיתי מסומן כחשוד?'),
    a: bi('A flag is a reason to look, not an accusation. Because every flag shows its evidence, an adjuster can clear a false alarm in seconds.', 'התרעה היא סיבה לבדוק, לא האשמה. כיוון שכל התרעה מציגה את הראיה, שמאי יכול לסגור אזעקת שווא תוך שניות.'),
  },
  {
    q: bi('Which documents does it handle?', 'אילו מסמכים המערכת יודעת לבדוק?'),
    a: bi('Receipts, invoices, medical summaries, police reports, damage and injury photos, scanned or photographed, in Hebrew and English.', 'קבלות, חשבוניות, סיכומי ביקור, אישורי משטרה, תמונות נזק ופציעה, סרוקים או מצולמים, בעברית ובאנגלית.'),
  },
  {
    q: bi('How do we know it works for us?', 'איך נדע שזה עובד אצלנו?'),
    a: bi('Start with a retro-pilot: we run it over a sample of your past, already-settled claims and show you what it would have caught.', 'מתחילים בפיילוט לאחור: מריצים את המערכת על מדגם של תביעות עבר שכבר נסגרו, ומראים לכם מה היא הייתה תופסת.'),
  },
];

// Illustrative targets for the pitch — replace with pilot results before showing externally.
export const illustrativeMetrics: readonly { readonly value: Bi; readonly label: Bi }[] = [
  { value: bi('< 10 sec', '< 10 שנ׳'), label: bi('to examine a claim’s documents', 'לבדיקת המסמכים של תביעה') },
  { value: bi('70%', '70%'), label: bi('of clean claims eligible for fast-track', 'מהתביעות הנקיות זכאיות למסלול מהיר') },
  { value: bi('3×', '3×'), label: bi('more suspicious claims surfaced before payout', 'יותר תביעות חשודות מתגלות לפני התשלום') },
];

export const illustrativeNote = bi('Illustrative targets. Replace with your pilot results.', 'יעדים להמחשה. יוחלפו בתוצאות הפיילוט שלכם.');
export const syntheticNote = bi('Demo with synthetic data. No real customer or provider.', 'הדגמה עם נתונים מומצאים. אין כאן לקוח או ספק אמיתיים.');

export const ctas = {
  primary: bi('Book a demo', 'לתיאום הדגמה'),
  secondary: bi('See it analyze a receipt', 'לראות ניתוח של קבלה'),
  pilot: bi('Run a retro-pilot on your claims', 'פיילוט לאחור על התביעות שלכם'),
};

export const demoForm = {
  title: bi('See it on your own claims', 'לראות את זה על התביעות שלכם'),
  intro: bi('Tell us a little about your claims operation. We’ll come back with a demo built around your lines of business.', 'ספרו לנו קצת על מחלקת התביעות. נחזור עם הדגמה שבנויה סביב תחומי הפעילות שלכם.'),
  name: bi('Full name', 'שם מלא'),
  email: bi('Work email', 'אימייל בעבודה'),
  company: bi('Insurer', 'חברת ביטוח'),
  role: bi('Role', 'תפקיד'),
  lines: bi('Main lines of business', 'תחומי פעילות עיקריים'),
  lineOptions: [bi('Health', 'בריאות'), bi('Motor', 'רכב'), bi('Property', 'דירה ורכוש'), bi('Travel', 'נסיעות'), bi('Life & disability', 'חיים ואובדן כושר')],
  volume: bi('Claims per month', 'תביעות בחודש'),
  volumeOptions: [bi('Under 1,000', 'פחות מ-1,000'), bi('1,000–10,000', '1,000–10,000'), bi('10,000–50,000', '10,000–50,000'), bi('Over 50,000', 'יותר מ-50,000')],
  submit: bi('Request a demo', 'בקשת הדגמה'),
  note: bi('Preview only: this form doesn’t send anything yet.', 'תצוגה בלבד: הטופס עדיין לא שולח דבר.'),
  thanks: bi('Thanks. In the live site, our team would reply within one business day.', 'תודה. באתר החי, הצוות שלנו היה חוזר אליכם תוך יום עסקים.'),
};

// ---------- Forensic demo (synthetic) ----------

export type Scenario = 'altered' | 'genuine';
export type FindingStatus = 'pass' | 'warn' | 'fail';
export type ReceiptField = 'clinic' | 'doctor' | 'license' | 'date' | 'service' | 'amount' | 'stamp';

export type Finding = {
  readonly field: ReceiptField;
  readonly check: Bi;
  readonly status: FindingStatus;
  readonly detail: Bi;
};

export const receipt = {
  clinic: bi('Northgate Orthopedic Clinic', 'מרפאת צפון לאורתופדיה'),
  address: bi('14 Harbor Street, Suite 3', 'רחוב הנמל 14, קומה 3'),
  title: bi('Receipt / Tax invoice', 'קבלה / חשבונית מס'),
  number: bi('No. 20488', 'מס׳ 20488'),
  patientLabel: bi('Patient', 'מטופל/ת'),
  patient: bi('D. Levin', 'ד. לוין'),
  doctorLabel: bi('Physician', 'רופא/ה'),
  doctor: bi('Dr. Maya Adler, Orthopedics', 'ד״ר מאיה אדלר, אורתופדיה'),
  licenseLabel: bi('License', 'מס׳ רישיון'),
  license: '27-4419',
  dateLabel: bi('Date of visit', 'תאריך ביקור'),
  date: bi('Sat, 14 Sep 2024', 'שבת, 14.09.2024'),
  service: bi('Specialist consultation + X-ray review', 'ייעוץ מומחה + פענוח צילום'),
  totalLabel: bi('Total paid', 'סה״כ שולם'),
  amountGenuine: bi('$450.00', '₪450.00'),
  amountAltered: bi('$1,450.00', '₪1,450.00'),
  stamp: bi('NORTHGATE · PAID', 'צפון · שולם'),
  claimId: 'CLM-24-08817',
  claimLabel: bi('Outpatient visit claim', 'תביעת ביקור אצל רופא מומחה'),
  dateGenuine: bi('Thu, 12 Sep 2024', 'חמישי, 12.09.2024'),
};

export const findings: Record<Scenario, readonly Finding[]> = {
  altered: [
    {
      field: 'amount',
      check: bi('Pixel forensics', 'ניתוח פיקסלים'),
      status: 'fail',
      detail: bi('“1” before “450” uses a different font and compression than the rest of the receipt.', '״1״ לפני ״450״ בגופן ובדחיסה שונים משאר הקבלה.'),
    },
    {
      field: 'license',
      check: bi('Provider registry', 'מרשם רופאים'),
      status: 'fail',
      detail: bi('License 27-4419 is registered to a different physician, not Dr. Adler.', 'רישיון 27-4419 רשום על שם רופא אחר, לא ד״ר אדלר.'),
    },
    {
      field: 'date',
      check: bi('Opening hours', 'שעות פעילות'),
      status: 'warn',
      detail: bi('Visit dated on a Saturday. The clinic is closed on Saturdays.', 'הביקור מתוארך לשבת. המרפאה סגורה בשבת.'),
    },
    {
      field: 'stamp',
      check: bi('Cross-claim match', 'השוואה בין תביעות'),
      status: 'fail',
      detail: bi('Identical stamp image on 2 earlier claims from 2 other policyholders.', 'תמונת חותמת זהה בשתי תביעות קודמות של שני מבוטחים אחרים.'),
    },
    {
      field: 'service',
      check: bi('Fee benchmark', 'השוואת תעריפים'),
      status: 'warn',
      detail: bi('Typical fee for this visit is $380–520. Claimed amount is 3× higher.', 'התעריף המקובל לביקור כזה הוא 380–520. הסכום שנתבע גבוה פי 3.'),
    },
    {
      field: 'clinic',
      check: bi('Image metadata', 'מטא-דאטה של התמונה'),
      status: 'fail',
      detail: bi('Photo was saved by an image editor 3 minutes before upload.', 'התמונה נשמרה בתוכנת עריכה 3 דקות לפני ההעלאה.'),
    },
  ],
  genuine: [
    {
      field: 'amount',
      check: bi('Pixel forensics', 'ניתוח פיקסלים'),
      status: 'pass',
      detail: bi('Typeface, alignment and compression are consistent across the page.', 'הגופן, היישור והדחיסה אחידים בכל הקבלה.'),
    },
    {
      field: 'license',
      check: bi('Provider registry', 'מרשם רופאים'),
      status: 'pass',
      detail: bi('License 27-4419 matches Dr. Maya Adler, orthopedics, active.', 'רישיון 27-4419 תואם לד״ר מאיה אדלר, אורתופדיה, בתוקף.'),
    },
    {
      field: 'date',
      check: bi('Opening hours', 'שעות פעילות'),
      status: 'pass',
      detail: bi('Thursday visit, within the clinic’s published hours.', 'ביקור ביום חמישי, בשעות הפעילות של המרפאה.'),
    },
    {
      field: 'stamp',
      check: bi('Cross-claim match', 'השוואה בין תביעות'),
      status: 'pass',
      detail: bi('Stamp is unique to this receipt series. No reuse found.', 'החותמת ייחודית לסדרת הקבלות הזו. לא נמצא שימוש חוזר.'),
    },
    {
      field: 'service',
      check: bi('Fee benchmark', 'השוואת תעריפים'),
      status: 'pass',
      detail: bi('$450 is within the typical range for this visit.', '450 בטווח המקובל לביקור כזה.'),
    },
    {
      field: 'clinic',
      check: bi('Image metadata', 'מטא-דאטה של התמונה'),
      status: 'pass',
      detail: bi('Photographed on the customer’s phone. No editing software.', 'צולם בטלפון של הלקוח. אין סימן לתוכנת עריכה.'),
    },
  ],
};

export const verdicts: Record<Scenario, { readonly score: number; readonly label: Bi; readonly action: Bi }> = {
  altered: {
    score: 94,
    label: bi('High risk', 'סיכון גבוה'),
    action: bi('Refer to investigations · hold payout of $1,450', 'להעביר לחקירה · לעכב תשלום של 1,450'),
  },
  genuine: {
    score: 6,
    label: bi('Low risk', 'סיכון נמוך'),
    action: bi('Fast-track · approve $450 today', 'מסלול מהיר · לאשר 450 עוד היום'),
  },
};

export const demoLabels = {
  claim: bi('Claim', 'תביעה'),
  upload: bi('Uploaded by customer · photo of receipt', 'הועלה על ידי הלקוח · צילום קבלה'),
  scanning: bi('Reading document…', 'קורא את המסמך…'),
  checking: bi('Running checks', 'מריץ בדיקות'),
  risk: bi('Fraud risk', 'סיכון להונאה'),
  replay: bi('Replay', 'להפעיל שוב'),
  play: bi('Play analysis', 'להפעיל ניתוח'),
  altered: bi('Altered receipt', 'קבלה מזויפת'),
  genuine: bi('Genuine receipt', 'קבלה אמיתית'),
  scenario: bi('Scenario', 'תרחיש'),
  pass: bi('Passed', 'תקין'),
  warn: bi('Review', 'לבדיקה'),
  fail: bi('Flagged', 'חשוד'),
};

// ---------- Savings estimator ----------

export const estimator = {
  title: bi('What is fraud costing you?', 'כמה ההונאה עולה לכם?'),
  claimsPerYear: bi('Claims per year', 'תביעות בשנה'),
  avgClaim: bi('Average paid claim', 'תביעה ממוצעת ששולמה'),
  fraudRate: bi('Share that is fraudulent', 'שיעור ההונאה'),
  fraudRateHint: bi('Industry estimate: ~10% (III)', 'הערכת התעשייה: כ-10% (III)'),
  catchRate: bi('Extra fraud stopped before payout', 'הונאה נוספת שנעצרת לפני תשלום'),
  catchRateHint: bi('Illustrative. Your pilot sets the real number.', 'להמחשה. הפיילוט יקבע את המספר האמיתי.'),
  leakage: bi('Paid to fraud each year', 'משולם להונאה בכל שנה'),
  saved: bi('Potential yearly savings', 'חיסכון שנתי אפשרי'),
  currency: bi('$', '₪'),
};

export function estimateSavings(input: { claimsPerYear: number; avgClaim: number; fraudRate: number; catchRate: number }): { leakage: number; saved: number } {
  const leakage = input.claimsPerYear * input.avgClaim * input.fraudRate;
  return { leakage, saved: leakage * input.catchRate };
}
