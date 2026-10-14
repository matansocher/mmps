import { bi, type Bi } from '../../lib/i18n.tsx';

export const nav = {
  label: bi('Main', 'ראשי'),
  menu: bi('Menu', 'תפריט'),
  links: [
    { href: '#analysis', label: bi('Analysis', 'ניתוח') },
    { href: '#checks', label: bi('What it checks', 'מה נבדק') },
    { href: '#procedure', label: bi('Procedure', 'תהליך') },
    { href: '#trust', label: bi('Trust', 'אמון') },
    { href: '#savings', label: bi('Savings', 'חיסכון') },
    { href: '#faq', label: bi('FAQ', 'שאלות') },
  ],
};

export const hero = {
  titleA: bi('Every forged receipt leaves a trace.', 'כל קבלה מזויפת משאירה עקבות.'),
  titleB: bi('Lumen makes it glow.', 'Lumen מאיר אותן.'),
  lede: bi(
    'Lumen’s AI examines every receipt, photo and document your customers submit, and shows your team exactly what was altered, before you pay.',
    'ה-AI של Lumen בוחן כל קבלה, תמונה ומסמך שהלקוחות שלכם מגישים, ומראה לצוות בדיוק מה שונה, לפני שאתם משלמים.',
  ),
  assurance: bi('People decide. Every flag comes with its evidence.', 'אנשים מחליטים. כל התרעה מגיעה עם הראיה.'),
  exhibit: bi('Exhibit A · Clinic receipt', 'מוצג א׳ · קבלה ממרפאה'),
  stageLabel: bi('Specimen under examination', 'מוצג בבדיקה'),
};

export const notes = {
  title: bi('Your adjusters can’t see the pixels. Fraudsters count on it.', 'השמאים שלכם לא רואים את הפיקסלים. המזייפים סומכים על זה.'),
  intro: bi('Four things every claims manager already knows, and pays for every month.', 'ארבעה דברים שכל מנהל תביעות כבר יודע, ומשלם עליהם בכל חודש.'),
  sheet: bi('Case notes · Why fraud gets paid', 'הערות תיק · למה הונאה מקבלת תשלום'),
};

export const lab = {
  title: bi('Six tests no adjuster can run by eye', 'שש בדיקות שאף שמאי לא יכול לעשות בעין'),
  hintHover: bi('Move the lamp across the specimens. Whatever was altered lights up.', 'העבירו את המנורה מעל המוצגים. כל מה ששונה נדלק.'),
  hintTouch: bi('The lamp sweeps on its own. Tap a test in the key to aim it.', 'המנורה סורקת בעצמה. הקישו על בדיקה במקרא כדי לכוון אותה.'),
  hintStatic: bi('Every hidden trace is shown below. Select a test to locate it.', 'כל העקבות הנסתרות מוצגות למטה. בחרו בדיקה כדי לאתר אותה.'),
  tableLabel: bi(
    'Two specimens under an ultraviolet lamp: a pharmacy invoice and a car-damage photo with its file data. The hidden alterations are listed in the key.',
    'שני מוצגים מתחת למנורה אולטרה-סגולה: חשבונית מבית מרקחת ותמונת נזק לרכב עם נתוני הקובץ. השינויים הנסתרים מפורטים במקרא.',
  ),
  keyLabel: bi('Examiner’s key', 'מקרא הבודק'),
  typical: bi('Typical find', 'ממצא טיפוסי'),
};

export const invoice = {
  exhibit: bi('Exhibit B · Pharmacy invoice', 'מוצג ב׳ · חשבונית בית מרקחת'),
  name: bi('Cedar Pharmacy', 'בית מרקחת ארז'),
  address: bi('7 Orchard Road', 'דרך הפרדס 7'),
  licenseLabel: bi('Pharm. licence', 'רישיון רוקחות'),
  license: '0418-22',
  title: bi('Invoice', 'חשבונית'),
  number: 'No. 7731',
  date: bi('Sat, 03 Oct 2026', 'שבת, 03.10.2026'),
  item: bi('Item', 'פריט'),
  qty: bi('Qty', 'כמות'),
  sum: bi('Sum', 'סכום'),
  lines: [
    { name: bi('Anti-inflammatory gel', 'ג׳ל נוגד דלקת'), qty: '2', sum: '64.00' },
    { name: bi('Knee brace, hinged', 'מגן ברך עם ציר'), qty: '1', sum: '476.00' },
  ],
  total: bi('Total', 'סה״כ'),
  currency: bi('$', '₪'),
  stamp: bi('CEDAR · PAID', 'ארז · שולם'),
};

export const photo = {
  exhibit: bi('Exhibit C · Damage photo', 'מוצג ג׳ · תמונת נזק'),
  claim: bi('Motor claim', 'תביעת רכב'),
  claimId: 'CLM-26-11402',
  reported: bi('Accident reported: 06 Oct 2026', 'תאונה דווחה: 06.10.2026'),
  exif: [
    { key: 'file', label: bi('File', 'קובץ'), value: 'IMG_4471.HEIC' },
    { key: 'taken', label: bi('Taken', 'צולם'), value: '2026-09-21 18:04' },
    { key: 'gps', label: bi('Location', 'מיקום'), value: '32.0853 N, 34.7818 E' },
  ],
  softwareLabel: bi('Software', 'תוכנה'),
  software: 'PhotoEdit Pro 7.2',
};

// Short labels that only appear under the lamp, keyed by `checks[].key`.
export const traces: Record<string, Bi> = {
  pixels: bi('2 glyphs re-typed · lines add up to 540.00', '2 תווים הוקלדו מחדש · השורות מסתכמות ב-540.00'),
  metadata: bi('Shot 15 days before the accident, then edited', 'צולם 15 יום לפני התאונה, ואז נערך'),
  duplicates: bi('Same stamp on 3 other claims', 'אותה חותמת ב-3 תביעות אחרות'),
  registry: bi('Licence not in registry', 'הרישיון לא קיים במרשם'),
  context: bi('Pharmacy closed on Saturdays', 'בית המרקחת סגור בשבת'),
  photos: bi('Image found on a car-sales listing', 'התמונה נמצאה במודעת מכירת רכב'),
};

export const procedure = {
  title: bi('From upload to decision, in four steps', 'מהעלאה להחלטה, בארבעה שלבים'),
  intro: bi('The same protocol for every claim, run in seconds instead of weeks.', 'אותו פרוטוקול לכל תביעה, תוך שניות במקום שבועות.'),
  step: bi('Step', 'שלב'),
};

export const trust = {
  title: bi('A lamp, not a judge', 'מנורה, לא שופט'),
  intro: bi('Lumen shows your team what it found. Your team decides what it means.', 'Lumen מראה לצוות שלכם מה נמצא. הצוות שלכם מחליט מה זה אומר.'),
};

export const proof = {
  title: bi('The cost of what goes unseen', 'המחיר של מה שלא רואים'),
  intro: bi('Public figures from the US market, where fraud is measured most closely.', 'נתונים ציבוריים מהשוק האמריקאי, שבו הונאות ביטוח נמדדות הכי מקרוב.'),
  source: bi('Source', 'מקור'),
  pilotTitle: bi('What we aim to show in your pilot', 'מה אנחנו מכוונים להראות בפיילוט שלכם'),
};

export const faq = {
  title: bi('Questions from claims leaders', 'שאלות של מנהלי תביעות'),
};

export const intake = {
  lede: bi('Bring a sample of settled claims. We’ll put them under the lamp and show you what was missed.', 'הביאו מדגם של תביעות שכבר נסגרו. נשים אותן מתחת למנורה ונראה לכם מה פוספס.'),
  form: bi('Intake form', 'טופס קליטה'),
};

export const footer = {
  line: bi('AI document forensics for insurers. Catch the alteration before the payout.', 'פורנזיקה של מסמכים מבוססת AI לחברות ביטוח. לתפוס את הזיוף לפני התשלום.'),
  preview: bi('Concept preview. Not a live product.', 'תצוגת קונספט. לא מוצר פעיל.'),
};
