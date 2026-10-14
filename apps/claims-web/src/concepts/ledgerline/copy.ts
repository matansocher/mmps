import { bi, type Bi } from '../../lib/i18n.tsx';
import { illustrativeNote, syntheticNote } from '../../content/index.ts';

export const NAME = 'Ledgerline';

export const copy = {
  skip: bi('Skip to content', 'דילוג לתוכן'),
  contents: bi('Contents', 'תוכן'),
  navLabel: bi('Report sections', 'פרקי הדוח'),
  homeLabel: bi('Ledgerline, top of page', 'Ledgerline, לראש העמוד'),
  reportTitle: bi('Annual report on claims integrity', 'דוח שנתי על אמינות תביעות'),
  period: bi('FY illustrative', 'שנת כספים להמחשה'),
  preparedFor: bi('Prepared for finance and claims leadership', 'מוגש להנהלת הכספים והתביעות'),
  h1: bi('Fraud is a line on your loss ratio. Make it shorter.', 'הונאה היא שורה ביחס ההפסד שלכם. הגיע הזמן לקצר אותה.'),
  lede: bi(
    'Ledgerline uses AI to check every receipt, photo and document a customer submits, and shows you what was altered before you pay.',
    'Ledgerline בודקת בעזרת AI כל קבלה, תמונה ומסמך שלקוח מגיש, ומראה לכם מה זויף לפני שאתם משלמים.',
  ),
  heroAside: bi(
    'The statement on this page is a working model. Enter your own volumes; every figure below follows them.',
    'הדוח בעמוד הזה הוא מודל חי. הזינו את הנתונים שלכם, וכל המספרים בהמשך יתעדכנו בהתאם.',
  ),

  statementTitle: bi('Statement of claims leakage', 'דוח דליפת תביעות'),
  assumptions: bi('Assumptions', 'הנחות'),
  result: bi('Result for the year', 'תוצאה לשנה'),
  claimsPaid: bi('Claims paid', 'תביעות ששולמו'),
  illustrative: bi('Illustrative', 'להמחשה'),
  amountCol: bi('Amount', 'סכום'),

  noteWord: bi('Note', 'ביאור'),
  bridgeTitle: bi('Where your claim dollars go', 'לאן הולך כסף התביעות'),
  bridgeLede: bi(
    'The statement above, drawn as a bridge. Of everything you pay out, a slice is fraud; part of that slice can be stopped before the money leaves.',
    'הדוח שלמעלה, בתרשים גשר. מכל מה שאתם משלמים, נתח הוא הונאה, וחלק מהנתח הזה אפשר לעצור לפני שהכסף יוצא.',
  ),
  bridgeAria: bi('Waterfall chart of claims paid, fraud and savings', 'תרשים מפל של תביעות ששולמו, הונאה וחיסכון'),
  barFraud: bi('Of which fraudulent', 'מתוכן הונאה'),
  barStopped: bi('Stopped before payout', 'נעצר לפני תשלום'),
  barNet: bi('Net savings', 'חיסכון נטו'),
  stillPaid: bi('Fraud still paid after review', 'הונאה שעדיין משולמת אחרי בדיקה'),
  axisNote: bi('The first bar is shortened (broken axis). The other three share one scale.', 'העמודה הראשונה מקוצרת (ציר שבור). שלוש האחרות באותו קנה מידה.'),

  leakTitle: bi('Why leakage persists', 'למה הדליפה נמשכת'),
  leakLede: bi(
    'Fraud rarely looks like fraud. It arrives as an ordinary claim with ordinary paperwork, and the process that pays everyone else pays it too. Four conditions keep the line item open.',
    'הונאה כמעט אף פעם לא נראית כמו הונאה. היא מגיעה כתביעה רגילה עם ניירת רגילה, ואותו תהליך שמשלם לכולם משלם גם לה. ארבעה תנאים משאירים את השורה הזו פתוחה.',
  ),
  colCondition: bi('Condition', 'תנאי'),
  colWhatHappens: bi('What happens', 'מה קורה'),
  colPnl: bi('Lands on the P&L as', 'מופיע בדוח רווח והפסד כ'),
  pnl: [
    bi('Inflated claims paid in full', 'תביעות מנופחות שמשולמות במלואן'),
    bi('Payouts written off or chased at cost', 'תשלומים שנמחקים או נגבים בעלות גבוהה'),
    bi('Premium pressure and slower service', 'לחץ על הפרמיות ושירות איטי יותר'),
    bi('The same loss, paid more than once', 'אותו הפסד, משולם יותר מפעם אחת'),
  ] as readonly Bi[],

  exhibitWord: bi('Exhibit A', 'נספח א׳'),
  exhibitTitle: bi('How a $1,450 receipt is examined', 'כך נבדקת קבלה על סך ₪1,450'),
  exhibitLede: bi(
    'A customer uploads a photo of a doctor’s receipt. Watch each control run against it, with the evidence an adjuster would see. Switch to the genuine receipt to see a clean claim fast-tracked.',
    'לקוח מעלה צילום של קבלה מרופא. צפו בכל בקרה שרצה עליה, עם הראיות ששמאי היה רואה. עברו לקבלה האמיתית כדי לראות תביעה נקייה עוברת למסלול מהיר.',
  ),

  controlsTitle: bi('Controls tested on every document', 'בקרות שנבדקות בכל מסמך'),
  controlsLede: bi(
    'Six independent controls run on each receipt, photo and form. A flag from any one of them is enough to route a claim to a person.',
    'שש בקרות בלתי תלויות רצות על כל קבלה, תמונה וטופס. התרעה מאחת מהן מספיקה כדי להעביר תביעה לבדיקה של אדם.',
  ),
  colControl: bi('Control', 'בקרה'),
  colTests: bi('What it tests', 'מה נבדק'),
  colExample: bi('Example finding', 'דוגמה לממצא'),
  colInExhibit: bi('In Exhibit A', 'בנספח א׳'),
  yes: bi('Applied', 'הופעלה'),
  no: bi('Not applicable', 'לא רלוונטית'),

  processTitle: bi('From intake to decision', 'מקליטה ועד החלטה'),
  processLede: bi('Four stages, inside the claims flow you already run. Your adjusters keep their tools; the evidence arrives with the claim.', 'ארבעה שלבים, בתוך תהליך התביעות הקיים. השמאים נשארים עם הכלים שלהם, והראיות מגיעות יחד עם התביעה.'),
  colStage: bi('Stage', 'שלב'),
  colWho: bi('Who acts', 'מי פועל'),
  who: [bi('Your systems', 'המערכות שלכם'), bi('Ledgerline', 'Ledgerline'), bi('Ledgerline', 'Ledgerline'), bi('Your team', 'הצוות שלכם')] as readonly Bi[],

  govTitle: bi('Governance', 'ממשל ובקרה'),
  govLede: bi('What the system may and may not do is set by you, written down, and auditable.', 'מה המערכת רשאית לעשות ומה לא, נקבע על ידכם, מתועד וניתן לביקורת.'),

  marketTitle: bi('Market context', 'הקשר שוק'),
  marketLede: bi('Published figures from public sources. Each one is linked in Notes & sources at the end of this report.', 'נתונים שפורסמו במקורות ציבוריים. כל אחד מהם מקושר בפרק ״הערות ומקורות״ בסוף הדוח.'),
  colMeasure: bi('Measure', 'מדד'),
  colFigure: bi('Figure', 'נתון'),
  colSource: bi('Source', 'מקור'),

  targetsTitle: bi('Targets (illustrative)', 'יעדים (להמחשה)'),
  targetsLede: bi('What a deployment is designed to achieve. These are not results; a retro-pilot on your own settled claims sets the real numbers.', 'מה שהטמעה נועדה להשיג. אלה אינן תוצאות. פיילוט לאחור על התביעות הסגורות שלכם יקבע את המספרים האמיתיים.'),
  colTarget: bi('Target', 'יעד'),
  colValue: bi('Value', 'ערך'),

  faqTitle: bi('Questions from the audit committee', 'שאלות מוועדת הביקורת'),

  demoTitle: bi('Next step: see it on your claims', 'הצעד הבא: לראות את זה על התביעות שלכם'),
  demoNext: bi('What happens next', 'מה קורה אחר כך'),
  demoSteps: [
    bi('A 30-minute call with your claims and finance leads.', 'שיחה של 30 דקות עם מובילי התביעות והכספים שלכם.'),
    bi('A demo on documents from your lines of business.', 'הדגמה על מסמכים מתחומי הפעילות שלכם.'),
    bi('An optional retro-pilot on a sample of settled claims.', 'פיילוט לאחור, לבחירתכם, על מדגם של תביעות סגורות.'),
  ] as readonly Bi[],

  notesTitle: bi('Notes & sources', 'הערות ומקורות'),
  backToRef: bi('Back to reference', 'חזרה להפניה'),
  footLine: bi('AI document checks for insurers, before the money leaves.', 'בדיקת מסמכים ב-AI לחברות ביטוח, לפני שהכסף יוצא.'),
  footPreview: bi('Concept preview. Not a live product; figures marked illustrative are assumptions.', 'תצוגת קונספט. לא מוצר חי; נתונים שמסומנים ״להמחשה״ הם הנחות.'),
  sourceNote: bi('Source note', 'הערת מקור'),
};

export type SourceNote = {
  readonly id: number;
  readonly text: Bi;
  readonly url?: string;
  readonly linkText?: string;
};

// Footnote ids are referenced by superscripts across the page.
export const FN = { coalition: 1, fbi: 2, iii: 3, method: 4, illustrative: 5, synthetic: 6 } as const;

export const sourceNotes: readonly SourceNote[] = [
  {
    id: FN.coalition,
    text: bi('Coalition Against Insurance Fraud (2022), “The Impact of Insurance Fraud on the U.S. Economy.”', 'Coalition Against Insurance Fraud ‏(2022), ״The Impact of Insurance Fraud on the U.S. Economy״.'),
    url: 'https://insurancefraud.org/fraud-stats/',
    linkText: 'insurancefraud.org',
  },
  {
    id: FN.fbi,
    text: bi('Federal Bureau of Investigation, “Insurance Fraud.”', 'FBI, ‏״Insurance Fraud״.'),
    url: 'https://www.fbi.gov/stats-services/publications/insurance-fraud',
    linkText: 'fbi.gov',
  },
  {
    id: FN.iii,
    text: bi('Insurance Information Institute, “Background on: Insurance fraud.” The ~10% fraud share used as the model default comes from this source.', 'Insurance Information Institute, ‏״Background on: Insurance fraud״. שיעור ההונאה של כ-10% שמשמש כברירת מחדל במודל לקוח ממקור זה.'),
    url: 'https://www.iii.org/article/background-on-insurance-fraud',
    linkText: 'iii.org',
  },
  {
    id: FN.method,
    text: bi(
      'Model method: fraud paid = claims per year × average paid claim × fraud share; potential savings = fraud paid × extra share stopped before payout. Inputs are yours; the model does not use any customer data.',
      'שיטת המודל: הונאה ששולמה = תביעות בשנה × תביעה ממוצעת × שיעור הונאה; חיסכון אפשרי = הונאה ששולמה × השיעור הנוסף שנעצר לפני תשלום. הנתונים הם שלכם; המודל לא משתמש בשום מידע של לקוחות.',
    ),
  },
  {
    id: FN.illustrative,
    text: bi(`${illustrativeNote.en} The “extra fraud stopped before payout” input and the figures in Targets are assumptions for this preview, not measured results.`, `${illustrativeNote.he} הנתון ״הונאה נוספת שנעצרת לפני תשלום״ והמספרים בפרק היעדים הם הנחות לתצוגה זו, לא תוצאות שנמדדו.`),
  },
  { id: FN.synthetic, text: syntheticNote },
];

export const sourceIdByUrl: Record<string, number> = {
  'https://insurancefraud.org/fraud-stats/': FN.coalition,
  'https://www.fbi.gov/stats-services/publications/insurance-fraud': FN.fbi,
  'https://www.iii.org/article/background-on-insurance-fraud': FN.iii,
};

// Which controls the Exhibit A receipt exercises (from the altered scenario's findings).
export const CONTROLS_IN_EXHIBIT = new Set(['pixels', 'metadata', 'duplicates', 'registry', 'context']);
