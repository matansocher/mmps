import { createContext, Fragment, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { EventType, FormResult, Language } from '../types';

export type { Language };

const STORAGE_KEY = 'coach:language';
export const DEFAULT_LANGUAGE: Language = 'he';

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const en = {
  nav: { brand: 'Coach Live', label: 'Main', live: 'Live', leagues: 'Leagues', settings: 'Settings' },
  common: {
    back: 'Back',
    close: 'Close',
    dismiss: 'Dismiss',
    loading: 'Loading…',
    tryAgain: 'Try again',
    live: 'Live',
    vs: 'vs',
    tbd: 'TBD',
    favouriteTeam: 'Favourite team',
    form: 'Form',
    years: (age: number) => `${age} yrs`,
    count: (title: string, n: number) => `${title} · ${n}`,
  },
  errors: {
    unauthorizedTitle: "We couldn't identify you",
    unauthorizedText: 'Open the dashboard with the /dashboard command in the Coach bot',
    notFoundTitle: 'Nothing here',
    notFoundText: 'This page is not available',
    failedTitle: "Couldn't load the data",
    failedText: 'Check your connection and try again',
  },
  form: { W: 'W', D: 'D', L: 'L' } as Record<FormResult, string>,
  formTitle: (result: FormResult, score: string, opponent: string) => `${{ W: 'Win', D: 'Draw', L: 'Loss' }[result]} ${score} vs ${opponent}`,
  events: {
    goal: { label: 'Goals', title: 'Goal' },
    redCard: { label: 'Red cards', title: 'Red card' },
    yellowCard: { label: 'Yellow cards', title: 'Yellow card' },
    missedPenalty: { label: 'Missed penalties', title: 'Missed penalty' },
    var: { label: 'VAR decisions', title: 'VAR' },
    woodwork: { label: 'Woodwork', title: 'Hit the woodwork' },
    substitution: { label: 'Substitutions', title: 'Substitution' },
  } as Record<EventType, { readonly label: string; readonly title: string }>,
  ownGoalShort: 'OG',
  dashboard: {
    title: 'Live',
    subtitle: (date: string, time: string) => `${date} · updated ${time}`,
    listView: 'List view',
    cardView: 'Card view',
    viewMode: 'View',
    refresh: 'Refresh',
    filterByLeague: 'Filter by league',
    all: 'All',
    myTeams: 'My teams',
    refreshFailed: 'Couldn’t refresh. Showing the last results; retrying automatically.',
    emptyTitle: 'No games today in your leagues',
    emptyText: 'Add more leagues or teams to follow and their games will show up here.',
    emptyAction: 'Choose leagues and teams',
    sections: { live: 'Live now', scheduled: 'Later today', other: 'Other', finished: 'Finished' },
  },
  card: {
    timeline: (status: string) => `Match timeline, ${status}`,
    redCards: (n: number) => (n > 1 ? `${n} red cards` : '1 red card'),
    countdown: (hours: number, minutes: number) => (hours === 0 ? `in ${minutes}m` : minutes === 0 ? `in ${hours}h` : `in ${hours}h ${minutes}m`),
    fullTime: 'FT',
    headlines: {
      champions: (team: string) => `${team} are champions!`,
      relegated: (team: string) => `${team} are relegated`,
      top: (team: string) => `${team} go top of the table`,
      lostTop: (team: string) => `${team} lose top spot`,
      zoneIn: (team: string, zone: string) => `${team} move into the ${zone} places`,
      zoneOut: (team: string, zone: string) => `${team} drop out of the ${zone} places`,
      dangerIn: (team: string, zone: string) => `${team} drop into the ${zone} zone`,
      dangerOut: (team: string, zone: string) => `${team} climb out of the ${zone} zone`,
      moveUp: (team: string, position: number) => `${team} climb to ${ordinal(position)}`,
      qualified: (team: string) => `${team} go through`,
    },
  },
  notifications: {
    more: (n: number) => `+${n} more`,
    clearAll: 'Clear all',
    lineupsConfirmed: 'Lineups confirmed',
    kickoffAt: (time: string) => `Kick-off ${time}`,
    kickoff: 'Kick-off',
    equaliser: 'Equaliser!',
    lateEqualiser: 'Late equaliser!',
    comeback: (team: string) => `Comeback! ${team} lead`,
    lateLead: (team: string) => `Late goal! ${team} lead`,
    takeLead: (team: string) => `${team} take the lead`,
    backInFront: (team: string) => `${team} back in front`,
    extendLead: (team: string) => `${team} extend the lead`,
    consolation: (team: string) => `Consolation for ${team}`,
    pullOneBack: (team: string) => `${team} pull one back`,
    brace: (text: string) => `${text} · brace`,
    hatTrick: (text: string) => `${text} · hat-trick!`,
    bothDownTo: (n: number) => `Both teams down to ${n}`,
    downTo: (team: string, n: number) => `${team} down to ${n}`,
    missPenalty: (team: string) => `${team} miss a penalty`,
    stillScore: (text: string, home: number, away: number) => `${text} · still ${home}-${away}`,
    fullTimeDraw: 'Full time – draw',
    fullTimeWin: (team: string) => `Full time – ${team} win`,
  },
  game: {
    title: 'Game',
    titleTeams: (home: string, away: string) => `${home} v ${away}`,
    overview: 'Overview',
    lineups: 'Lineups',
    table: 'Table',
    competition: 'Competition',
    kickoff: 'Kick-off',
    tv: 'TV',
    venue: 'Venue',
    referee: 'Referee',
    timeline: 'Timeline',
    stats: 'Stats',
    noTable: 'No table for this game',
    openCompetition: (name: string) => `Open ${name}`,
    halftime: (home: number, away: number) => `HT ${home} - ${away}`,
    noEvents: 'No events yet',
    assist: 'Assist:',
    noStats: 'No stats yet',
    showLess: 'Show less',
    showAll: (n: number) => `Show all ${n} stats`,
    startingXI: 'Starting XI',
    substitutes: 'Substitutes',
    missing: 'Missing',
    coach: 'Coach',
  },
  h2h: {
    form: 'Form',
    formHint: 'Last 5 · newest right',
    title: 'Head to head',
    wins: (team: string) => `${team} wins`,
    draws: 'Draws',
    lastMeetings: (n: number) => `Last ${n} meetings`,
  },
  team: {
    title: 'Team',
    matches: 'Matches',
    squad: 'Squad',
    upcoming: 'Upcoming',
    recent: 'Recent',
    noUpcoming: 'No upcoming games',
    noRecent: 'No recent games',
  },
  player: {
    title: 'Player',
    club: 'Club',
    clubPage: 'Club page',
    thisSeason: 'This season',
    recentGames: 'Recent games',
  },
  leagues: {
    title: 'Leagues',
    subtitle: 'Tables and knockout brackets',
    following: 'Following',
    more: 'More leagues',
    all: 'All leagues',
    today: (n: number) => `${n} today`,
    yourTeams: (n: number) => (n === 1 ? '1 of your teams' : `${n} of your teams`),
  },
  league: {
    title: 'League',
    today: 'Today',
    table: 'Table',
    groups: 'Groups',
    knockout: 'Knockout',
    matchdays: 'Matchdays',
    matchday: (n: number) => `Matchday ${n}`,
    matchdayKind: { previous: 'Last', current: 'In play', next: 'Next' } as Record<'previous' | 'current' | 'next', string>,
    playedOf: (played: number, total: number) => `${played} of ${total} games played`,
    gamesCount: (n: number) => `${n} games`,
    empty: 'No table or bracket available yet',
  },
  standings: {
    movedUp: 'Moved up',
    movedDown: 'Moved down',
    openLiveGame: 'Open live game',
    versus: (name: string) => `vs ${name}`,
    liveTable: 'Live table',
    liveTableNote: 'includes games in play',
    team: 'Team',
    played: 'P',
    won: 'W',
    drawn: 'D',
    lost: 'L',
    goalDiff: 'GD',
    points: 'Pts',
    form: 'Form',
  },
  bracket: {
    leg: (n: number) => `Leg ${n}`,
    match: 'Match',
    noGames: 'No games scheduled yet',
    aggregate: 'Aggregate:',
    advance: (team: string, stage: string) => `${team} advance to the ${stage}`,
    empty: 'No knockout stage yet',
  },
  settings: {
    title: 'Settings',
    subtitle: 'What shows up on your live dashboard',
    error: 'Something went wrong, please try again',
    language: 'Language',
    languageSubtitle: 'Interface and football data (team and player names)',
    leagues: 'Leagues',
    leaguesSubtitle: "Today's games from these leagues appear on the dashboard",
    myTeams: 'My teams',
    favoritesTitle: 'Your favorite teams',
    noFavorites: 'No favorite teams yet. Search above to add one.',
    myTeamsSubtitle: "Listed first in each section, and shown even when their league isn't selected",
    remove: (name: string) => `Remove ${name}`,
    searchPlaceholder: 'Search a team (e.g. Maccabi Haifa, Arsenal)',
    searching: 'Searching…',
    added: 'Added',
    add: '+ Add',
    notifications: 'Notifications',
    notificationsSubtitle: 'Which events pop up as notifications. Game cards always show goals, red cards, missed penalties and VAR.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
  },
};

export type Messages = typeof en;

const he: Messages = {
  nav: { brand: 'Coach Live', label: 'ראשי', live: 'לייב', leagues: 'ליגות', settings: 'הגדרות' },
  common: {
    back: 'חזרה',
    close: 'סגירה',
    dismiss: 'הסתרה',
    loading: 'טוען…',
    tryAgain: 'נסו שוב',
    live: 'לייב',
    vs: 'נגד',
    tbd: 'טרם נקבע',
    favouriteTeam: 'קבוצה אהובה',
    form: 'כושר',
    years: (age) => `בן ${age}`,
    count: (title, n) => `${title} · ${n}`,
  },
  errors: {
    unauthorizedTitle: 'לא הצלחנו לזהות אותך',
    unauthorizedText: 'פתחו את הלוח עם הפקודה ‎/dashboard בבוט Coach',
    notFoundTitle: 'אין כאן כלום',
    notFoundText: 'העמוד הזה לא זמין',
    failedTitle: 'לא הצלחנו לטעון את הנתונים',
    failedText: 'בדקו את החיבור ונסו שוב',
  },
  form: { W: 'נ', D: 'ת', L: 'ה' },
  formTitle: (result, score, opponent) => `${{ W: 'ניצחון', D: 'תיקו', L: 'הפסד' }[result]} ${score} מול ${opponent}`,
  events: {
    goal: { label: 'שערים', title: 'שער' },
    redCard: { label: 'כרטיסים אדומים', title: 'כרטיס אדום' },
    yellowCard: { label: 'כרטיסים צהובים', title: 'כרטיס צהוב' },
    missedPenalty: { label: 'פנדלים מוחמצים', title: 'פנדל מוחמץ' },
    var: { label: 'החלטות VAR', title: 'VAR' },
    woodwork: { label: 'פגיעות במסגרת', title: 'פגיעה במסגרת' },
    substitution: { label: 'חילופים', title: 'חילוף' },
  },
  ownGoalShort: 'עצמי',
  dashboard: {
    title: 'לייב',
    subtitle: (date, time) => `${date} · עודכן ב-${time}`,
    listView: 'תצוגת רשימה',
    cardView: 'תצוגת כרטיסים',
    viewMode: 'תצוגה',
    refresh: 'רענון',
    filterByLeague: 'סינון לפי ליגה',
    all: 'הכל',
    myTeams: 'הקבוצות שלי',
    refreshFailed: 'הרענון נכשל. מוצגות התוצאות האחרונות, ננסה שוב אוטומטית.',
    emptyTitle: 'אין היום משחקים בליגות שלך',
    emptyText: 'הוסיפו ליגות או קבוצות למעקב והמשחקים שלהן יופיעו כאן.',
    emptyAction: 'בחירת ליגות וקבוצות',
    sections: { live: 'משחקים עכשיו', scheduled: 'בהמשך היום', other: 'אחר', finished: 'הסתיימו' },
  },
  card: {
    timeline: (status) => `ציר המשחק, ${status}`,
    redCards: (n) => (n > 1 ? `${n} כרטיסים אדומים` : 'כרטיס אדום'),
    countdown: (hours, minutes) => (hours === 0 ? `בעוד ${minutes} ד׳` : minutes === 0 ? `בעוד ${hours} ש׳` : `בעוד ${hours} ש׳ ${minutes} ד׳`),
    fullTime: 'הסתיים',
    headlines: {
      champions: (team) => `${team} אלופה!`,
      relegated: (team) => `${team} ירדה ליגה`,
      top: (team) => `${team} עלתה למקום הראשון`,
      lostTop: (team) => `${team} איבדה את המקום הראשון`,
      zoneIn: (team, zone) => `${team} נכנסה למקומות ${zone}`,
      zoneOut: (team, zone) => `${team} יצאה ממקומות ${zone}`,
      dangerIn: (team, zone) => `${team} נכנסה לאזור ${zone}`,
      dangerOut: (team, zone) => `${team} יצאה מאזור ${zone}`,
      moveUp: (team, position) => `${team} עלתה למקום ${position}`,
      qualified: (team) => `${team} העפילה לשלב הבא`,
    },
  },
  notifications: {
    more: (n) => `עוד ${n}`,
    clearAll: 'ניקוי הכל',
    lineupsConfirmed: 'ההרכבים פורסמו',
    kickoffAt: (time) => `שריקת פתיחה ב-${time}`,
    kickoff: 'שריקת פתיחה',
    equaliser: 'שוויון!',
    lateEqualiser: 'שוויון מאוחר!',
    comeback: (team) => `מהפך! ${team} ביתרון`,
    lateLead: (team) => `שער מאוחר! ${team} ביתרון`,
    takeLead: (team) => `${team} עולה ליתרון`,
    backInFront: (team) => `${team} חוזרת ליתרון`,
    extendLead: (team) => `${team} מגדילה את היתרון`,
    consolation: (team) => `שער כבוד ל${team}`,
    pullOneBack: (team) => `${team} מצמקת`,
    brace: (text) => `${text} · צמד`,
    hatTrick: (text) => `${text} · שלושער!`,
    bothDownTo: (n) => `שתי הקבוצות ב-${n}`,
    downTo: (team, n) => `${team} נותרת ב-${n}`,
    missPenalty: (team) => `${team} מחמיצה פנדל`,
    stillScore: (text, home, away) => `${text} · עדיין ${home}-${away}`,
    fullTimeDraw: 'סיום – תיקו',
    fullTimeWin: (team) => `סיום – ניצחון ל${team}`,
  },
  game: {
    title: 'משחק',
    titleTeams: (home, away) => `${home} נגד ${away}`,
    overview: 'סקירה',
    lineups: 'הרכבים',
    table: 'טבלה',
    competition: 'מסגרת',
    kickoff: 'פתיחה',
    tv: 'שידור',
    venue: 'אצטדיון',
    referee: 'שופט',
    timeline: 'מהלך המשחק',
    stats: 'סטטיסטיקה',
    noTable: 'אין טבלה למשחק הזה',
    openCompetition: (name) => `ל${name}`,
    halftime: (home, away) => `מחצית ${home} - ${away}`,
    noEvents: 'עדיין אין אירועים',
    assist: 'בישול:',
    noStats: 'עדיין אין סטטיסטיקה',
    showLess: 'הצג פחות',
    showAll: (n) => `הצג את כל ${n} הנתונים`,
    startingXI: 'הרכב פותח',
    substitutes: 'ספסל',
    missing: 'חסרים',
    coach: 'מאמן',
  },
  h2h: {
    form: 'כושר',
    formHint: '5 אחרונים · האחרון משמאל',
    title: 'ראש בראש',
    wins: (team) => `ניצחונות ${team}`,
    draws: 'תיקו',
    lastMeetings: (n) => `${n} המפגשים האחרונים`,
  },
  team: {
    title: 'קבוצה',
    matches: 'משחקים',
    squad: 'סגל',
    upcoming: 'הבאים',
    recent: 'אחרונים',
    noUpcoming: 'אין משחקים קרובים',
    noRecent: 'אין משחקים אחרונים',
  },
  player: {
    title: 'שחקן',
    club: 'מועדון',
    clubPage: 'לעמוד הקבוצה',
    thisSeason: 'העונה',
    recentGames: 'משחקים אחרונים',
  },
  leagues: {
    title: 'ליגות',
    subtitle: 'טבלאות ושלבי נוקאאוט',
    following: 'במעקב',
    more: 'ליגות נוספות',
    all: 'כל הליגות',
    today: (n) => `${n} היום`,
    yourTeams: (n) => (n === 1 ? 'קבוצה אחת שלך' : `${n} מהקבוצות שלך`),
  },
  league: {
    title: 'ליגה',
    today: 'היום',
    table: 'טבלה',
    groups: 'בתים',
    knockout: 'נוקאאוט',
    matchdays: 'מחזורים',
    matchday: (n) => `מחזור ${n}`,
    matchdayKind: { previous: 'אחרון', current: 'מתקיים', next: 'הבא' },
    playedOf: (played, total) => `${played} מתוך ${total} משחקים שוחקו`,
    gamesCount: (n) => `${n} משחקים`,
    empty: 'עדיין אין טבלה או עץ גביע',
  },
  standings: {
    movedUp: 'עלתה',
    movedDown: 'ירדה',
    openLiveGame: 'למשחק החי',
    versus: (name) => `מול ${name}`,
    liveTable: 'טבלה חיה',
    liveTableNote: 'כולל משחקים שמתקיימים עכשיו',
    team: 'קבוצה',
    played: 'מש׳',
    won: 'נ',
    drawn: 'ת',
    lost: 'ה',
    goalDiff: 'הפרש',
    points: 'נק׳',
    form: 'כושר',
  },
  bracket: {
    leg: (n) => `משחק ${n}`,
    match: 'משחק',
    noGames: 'עדיין לא נקבעו משחקים',
    aggregate: 'בסיכום:',
    advance: (team, stage) => `${team} עולה ל${stage}`,
    empty: 'עדיין אין שלב נוקאאוט',
  },
  settings: {
    title: 'הגדרות',
    subtitle: 'מה מופיע בלוח הלייב שלך',
    error: 'משהו השתבש, נסו שוב',
    language: 'שפה',
    languageSubtitle: 'ממשק ונתוני הכדורגל (שמות קבוצות ושחקנים)',
    leagues: 'ליגות',
    leaguesSubtitle: 'משחקי היום מהליגות האלה יופיעו בלוח',
    myTeams: 'הקבוצות שלי',
    favoritesTitle: 'הקבוצות האהובות שלך',
    noFavorites: 'עדיין אין קבוצות אהובות. אפשר לחפש ולהוסיף למעלה.',
    myTeamsSubtitle: 'מופיעות ראשונות בכל קבוצת משחקים, גם אם הליגה שלהן לא נבחרה',
    remove: (name) => `הסרת ${name}`,
    searchPlaceholder: 'חיפוש קבוצה (למשל מכבי חיפה, ארסנל)',
    searching: 'מחפש…',
    added: 'נוספה',
    add: '+ הוספה',
    notifications: 'התראות',
    notificationsSubtitle: 'אילו אירועים יקפצו כהתראה. כרטיסי המשחק תמיד מציגים שערים, אדומים, פנדלים מוחמצים ו-VAR.',
    save: 'שמירה',
    saving: 'שומר…',
    saved: 'נשמר',
  },
};

const MESSAGES: Record<Language, Messages> = { en, he };
export const LANGUAGE_NAMES: Record<Language, string> = { he: 'עברית', en: 'English' };

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'he' || stored === 'en') return stored;
  } catch {
    // ignore unavailable storage
  }
  return DEFAULT_LANGUAGE;
}

let currentLanguage: Language = readStoredLanguage();

function applyLanguage(language: Language) {
  currentLanguage = language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignore unavailable storage
  }
}

applyLanguage(currentLanguage);

// For non-React helpers (API calls, formatting, notification titles).
export function getLanguage(): Language {
  return currentLanguage;
}

export function getLocale(): string {
  return currentLanguage === 'he' ? 'he-IL' : 'en-GB';
}

export function messages(): Messages {
  return MESSAGES[currentLanguage];
}

type LanguageState = { readonly language: Language; readonly setLanguage: (language: Language) => void };

const LanguageContext = createContext<LanguageState | null>(null);

// Everything below remounts on a language change so data refetches in the new language.
export function LanguageProvider({ children }: { readonly children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(currentLanguage);
  const setLanguage = useCallback((next: Language) => {
    if (next === currentLanguage) return;
    applyLanguage(next);
    setLanguageState(next);
  }, []);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return (
    <LanguageContext.Provider value={value}>
      <Fragment key={language}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

export function useT(): Messages {
  return MESSAGES[useLanguage().language];
}
