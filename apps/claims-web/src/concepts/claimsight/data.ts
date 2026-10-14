import { bi, type Bi, type Lang } from '../../lib/i18n.tsx';

export type LineKey = 'health' | 'motor' | 'property' | 'travel';
export type Tier = 'high' | 'review' | 'clean';
export type Decision = 'approved' | 'referred';

export type QueueClaim = {
  readonly uid: string;
  readonly id: string;
  readonly initial: Bi;
  readonly line: LineKey;
  readonly amount: number;
  readonly doc: Bi;
  readonly score: number;
  readonly arrivedAt: number;
  readonly scored: boolean;
};

type Template = Omit<QueueClaim, 'uid' | 'id' | 'arrivedAt' | 'scored'>;

export const LINES: Record<LineKey, Bi> = {
  health: bi('Health', 'בריאות'),
  motor: bi('Motor', 'רכב'),
  property: bi('Property', 'רכוש'),
  travel: bi('Travel', 'נסיעות'),
};

export const TIER_LABEL: Record<Tier, Bi> = {
  high: bi('Hold · investigate', 'עיכוב · לחקירה'),
  review: bi('Adjuster review', 'לבדיקת שמאי'),
  clean: bi('Fast-tracked', 'מסלול מהיר'),
};

export const TIER_NAME: Record<Tier, Bi> = {
  high: bi('High risk', 'סיכון גבוה'),
  review: bi('Needs a look', 'דורש בדיקה'),
  clean: bi('Low risk', 'סיכון נמוך'),
};

export const DECISION_LABEL: Record<Decision, Bi> = {
  approved: bi('Approved by you', 'אושר על ידך'),
  referred: bi('Referred by you', 'הועבר על ידך'),
};

export const FEATURED_ID = 'CLM-24-08817';

export function tierOf(score: number): Tier {
  if (score >= 70) return 'high';
  if (score >= 35) return 'review';
  return 'clean';
}

export function money(amount: number, lang: Lang): string {
  return `${lang === 'he' ? '₪' : '$'}${amount.toLocaleString('en-US')}`;
}

const SEED: readonly (Template & { readonly id: string })[] = [
  { id: FEATURED_ID, initial: bi('D. Levin', 'ד. לוין'), line: 'health', amount: 1450, doc: bi('Clinic receipt', 'קבלה ממרפאה'), score: 94 },
  { id: 'CLM-24-08809', initial: bi('R. Cohen', 'ר. כהן'), line: 'motor', amount: 6820, doc: bi('Damage photos', 'תמונות נזק'), score: 81 },
  { id: 'CLM-24-08812', initial: bi('S. Mizrahi', 'ש. מזרחי'), line: 'property', amount: 3900, doc: bi('Repair invoice', 'חשבונית תיקון'), score: 58 },
  { id: 'CLM-24-08814', initial: bi('A. Peretz', 'א. פרץ'), line: 'travel', amount: 1180, doc: bi('Medical summary', 'סיכום ביקור'), score: 41 },
  { id: 'CLM-24-08816', initial: bi('L. Biton', 'ל. ביטון'), line: 'health', amount: 380, doc: bi('Clinic receipt', 'קבלה ממרפאה'), score: 9 },
  { id: 'CLM-24-08815', initial: bi('M. Avraham', 'מ. אברהם'), line: 'health', amount: 220, doc: bi('Pharmacy receipt', 'קבלה מבית מרקחת'), score: 7 },
  { id: 'CLM-24-08813', initial: bi('N. Friedman', 'נ. פרידמן'), line: 'travel', amount: 310, doc: bi('Baggage receipt', 'קבלת כבודה'), score: 4 },
  { id: 'CLM-24-08811', initial: bi('Y. Shapiro', 'י. שפירא'), line: 'motor', amount: 940, doc: bi('Repair estimate', 'הצעת מחיר למוסך'), score: 12 },
  { id: 'CLM-24-08810', initial: bi('O. Katz', 'א. כ״ץ'), line: 'property', amount: 1260, doc: bi('Damage photos', 'תמונות נזק'), score: 18 },
];

// Roughly 7 in 10 arrivals are clean, which is what makes the fast-track lane matter.
const INCOMING: readonly Template[] = [
  { initial: bi('T. Golan', 'ת. גולן'), line: 'health', amount: 260, doc: bi('Pharmacy receipt', 'קבלה מבית מרקחת'), score: 5 },
  { initial: bi('E. Levi', 'א. לוי'), line: 'motor', amount: 4300, doc: bi('Damage photos', 'תמונות נזק'), score: 76 },
  { initial: bi('H. Dahan', 'ח. דהן'), line: 'travel', amount: 540, doc: bi('Baggage receipt', 'קבלת כבודה'), score: 11 },
  { initial: bi('I. Ben-David', 'י. בן דוד'), line: 'property', amount: 2150, doc: bi('Repair invoice', 'חשבונית תיקון'), score: 23 },
  { initial: bi('G. Amar', 'ג. עמר'), line: 'health', amount: 620, doc: bi('Clinic receipt', 'קבלה ממרפאה'), score: 8 },
  { initial: bi('B. Ohana', 'ב. אוחנה'), line: 'motor', amount: 1720, doc: bi('Police report', 'אישור משטרה'), score: 47 },
  { initial: bi('K. Rosen', 'ק. רוזן'), line: 'travel', amount: 890, doc: bi('Medical summary', 'סיכום ביקור'), score: 14 },
  { initial: bi('V. Azulay', 'ו. אזולאי'), line: 'property', amount: 7400, doc: bi('Damage photos', 'תמונות נזק'), score: 88 },
  { initial: bi('P. Weiss', 'פ. וייס'), line: 'health', amount: 140, doc: bi('Lab invoice', 'חשבונית מעבדה'), score: 3 },
  { initial: bi('Z. Hadad', 'ז. חדד'), line: 'motor', amount: 2600, doc: bi('Repair estimate', 'הצעת מחיר למוסך'), score: 19 },
];

export const QUEUE_CAP = SEED.length;

export const INITIAL_TALLY = { fastTracked: 1284, held: 37, amountHeld: 48920 };
export type Tally = typeof INITIAL_TALLY;

export function addToTally(t: Tally, c: QueueClaim): Tally {
  if (tierOf(c.score) === 'clean') return { ...t, fastTracked: t.fastTracked + 1 };
  return { ...t, held: t.held + 1, amountHeld: t.amountHeld + c.amount };
}

const RANK: Record<Tier, number> = { high: 0, review: 1, clean: 2 };

// Risky claims sorted by score; clean claims newest-first so arrivals visibly slide into the fast-track lane.
export function sortRows(rows: readonly QueueClaim[]): QueueClaim[] {
  const next = [...rows].sort((a, b) => {
    const ta = tierOf(a.score);
    const tb = tierOf(b.score);
    if (ta !== tb) return RANK[ta] - RANK[tb];
    if (ta === 'clean') return b.arrivedAt - a.arrivedAt;
    return b.score - a.score;
  });
  return next.every((r, i) => r === rows[i]) ? (rows as QueueClaim[]) : next;
}

export function initialRows(): QueueClaim[] {
  return sortRows(SEED.map((s, i) => ({ ...s, uid: s.id, arrivedAt: i, scored: true })));
}

export function makeIncoming(n: number): QueueClaim {
  const tpl = INCOMING[n % INCOMING.length];
  const id = `CLM-24-${String(8818 + n).padStart(5, '0')}`;
  return { ...tpl, id, uid: id, arrivedAt: 100 + n, scored: false };
}

export function insertRow(rows: readonly QueueClaim[], c: QueueClaim): QueueClaim[] {
  let rest = [...rows];
  if (rest.length >= QUEUE_CAP) {
    const clean = rest.filter((r) => r.scored && tierOf(r.score) === 'clean');
    const drop = clean.length ? clean.reduce((a, b) => (a.arrivedAt < b.arrivedAt ? a : b)) : rest[rest.length - 1];
    rest = rest.filter((r) => r !== drop);
  }
  return [c, ...rest];
}
