import { bi, type Bi } from './i18n.tsx';

export type ConceptSlug = 'lumen' | 'verity' | 'ledgerline' | 'claimsight' | 'candor';

export type Concept = {
  readonly slug: ConceptSlug;
  readonly index: number;
  readonly name: string;
  readonly world: Bi;
  readonly idea: Bi;
  readonly speaksTo: Bi;
  readonly signature: Bi;
  readonly swatches: readonly string[];
  readonly preview: string;
};

export const concepts: readonly Concept[] = [
  {
    slug: 'lumen',
    index: 1,
    name: 'Lumen',
    preview: 'previews/lumen.jpg',
    world: bi('The forensic lab', 'מעבדה פורנזית'),
    idea: bi(
      'Document examiners use ultraviolet light to reveal what the naked eye misses. Lumen turns that into the brand: every receipt passes under a scanning lamp and the alterations light up.',
      'בודקי מסמכים משתמשים באור אולטרה-סגול כדי לחשוף את מה שהעין לא רואה. Lumen הופך את זה למותג: כל קבלה עוברת מתחת למנורת סריקה, והזיופים נדלקים.',
    ),
    speaksTo: bi('Heads of claims who want to see the technology, not hear about it', 'מנהלי תביעות שרוצים לראות את הטכנולוגיה, לא לשמוע עליה'),
    signature: bi('A UV lamp that follows your pointer and makes the edits glow', 'מנורת UV שעוקבת אחרי הסמן וגורמת לזיופים לזהור'),
    swatches: ['#120f2e', '#8b6cff', '#d8ff3e'],
  },
  {
    slug: 'verity',
    index: 2,
    name: 'Verity',
    preview: 'previews/verity.jpg',
    world: bi('The investigator’s case file', 'תיק החקירה'),
    idea: bi(
      'Your fraud unit lives in case files: tabs, file numbers, stamps. Verity is built as one, so the page reads like a claim being investigated and stamped, from intake to verdict.',
      'יחידת ההונאות שלכם חיה בתוך תיקים: לשוניות, מספרי תיק, חותמות. Verity בנוי כתיק כזה, והדף נקרא כמו תביעה שנחקרת ומקבלת חותמת, מהקליטה ועד ההכרעה.',
    ),
    speaksTo: bi('SIU leads and claims managers who think in cases', 'ראשי יחידות חקירה ומנהלי תביעות שחושבים בתיקים'),
    signature: bi('A case file whose verdict stamp lands as you scroll', 'תיק שחותמת ההכרעה שלו ננחתת תוך כדי גלילה'),
    swatches: ['#dfe5eb', '#14233a', '#c8312b'],
  },
  {
    slug: 'ledgerline',
    index: 3,
    name: 'Ledgerline',
    preview: 'previews/ledgerline.jpg',
    world: bi('The CFO’s annual report', 'הדוח השנתי של סמנכ״ל הכספים'),
    idea: bi(
      'Fraud is a line on the loss ratio. Ledgerline speaks finance: tabular figures, footnoted sources, a savings model you can run with your own numbers.',
      'הונאה היא שורה ביחס ההפסד. Ledgerline מדבר בשפה של כספים: מספרים בטבלאות, מקורות בהערות שוליים, ומודל חיסכון שאפשר להריץ עם הנתונים שלכם.',
    ),
    speaksTo: bi('CFOs, COOs and whoever signs the budget', 'סמנכ״לי כספים ותפעול, ומי שחותם על התקציב'),
    signature: bi('A live savings model on the first screen', 'מודל חיסכון חי כבר במסך הראשון'),
    swatches: ['#ffffff', '#0b1f3a', '#0f7b4f'],
  },
  {
    slug: 'claimsight',
    index: 4,
    name: 'Claimsight',
    preview: 'previews/claimsight.jpg',
    world: bi('The triage console', 'קונסולת המיון'),
    idea: bi(
      'Show the product, not a promise. Claimsight opens on the actual work surface: claims arriving, scored and sorted, with the risky ones rising to the top.',
      'להראות את המוצר, לא הבטחה. Claimsight נפתח על מסך העבודה עצמו: תביעות נכנסות, מקבלות ציון וממוינות, והחשודות עולות למעלה.',
    ),
    speaksTo: bi('Operations leaders who will roll it out to adjusters', 'מנהלי תפעול שיטמיעו את המערכת אצל השמאים'),
    signature: bi('A live claims queue you can click into', 'תור תביעות חי שאפשר להיכנס לכל אחת מהן'),
    swatches: ['#f5f6f8', '#101828', '#2f54eb'],
  },
  {
    slug: 'candor',
    index: 5,
    name: 'Candor',
    preview: 'previews/candor.jpg',
    world: bi('The honest majority', 'הרוב הישר'),
    idea: bi(
      'Most customers tell the truth, and fraud makes all of them wait. Candor leads with that tension: catch the forged receipt and pay everyone else faster.',
      'רוב הלקוחות אומרים אמת, וההונאה גורמת לכולם לחכות. Candor מוביל עם המתח הזה: לתפוס את הקבלה המזויפת ולשלם לכל השאר מהר יותר.',
    ),
    speaksTo: bi('CEOs and customer-experience owners who protect the brand', 'מנכ״לים ומנהלי חוויית לקוח ששומרים על המותג'),
    signature: bi('Flip the same receipt between honest and altered', 'החלפה של אותה קבלה בין אמיתית למזויפת'),
    swatches: ['#0f3d2e', '#eef3ec', '#f2c94c'],
  },
];

export const isConceptSlug = (s: string | undefined): s is ConceptSlug => concepts.some((c) => c.slug === s);
