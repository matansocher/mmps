import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { MatchDto, ProfileDto } from '../lib/types';
import { MatchCard, MatchCardSkeleton } from '../components/MatchCard';
import { GuessSheet } from '../components/GuessSheet';
import { BottomNav } from '../components/BottomNav';
import { CalendarSheet } from '../components/CalendarSheet';
import { toDateString } from '../lib/dates';

function getMatchDate(m: MatchDto): string {
  const d = new Date(m.startTime);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')!.value;
  const mo = parts.find((p) => p.type === 'month')!.value;
  const da = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${mo}-${da}`;
}

type MatchGroup = { date: string; label: string; matches: MatchDto[] };

function formatDateHeader(dateStr: string): string {
  const today = toDateString(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  const [, m, d] = dateStr.split('-');
  const ddmm = `${d}.${m}`;

  if (dateStr === today) return `היום · ${ddmm}`;
  if (dateStr === tomorrowStr) return `מחר · ${ddmm}`;
  if (dateStr === yesterdayStr) return `אתמול · ${ddmm}`;

  const dow = new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long' });
  return `${dow} · ${ddmm}`;
}

function groupByDate(matches: MatchDto[]): MatchGroup[] {
  const map = new Map<string, MatchDto[]>();
  for (const m of matches) {
    const date = getMatchDate(m);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(m);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, matches]) => ({ date, label: formatDateHeader(date), matches }));
}

export function MatchesPage() {
  const [allMatches, setAllMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guessMatch, setGuessMatch] = useState<MatchDto | null>(null);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [floatingLabel, setFloatingLabel] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const didScroll = useRef(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.matches();
      setAllMatches(data.matches);
    } catch {
      if (!silent) setAllMatches([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { api.profile().then(setProfile).catch(() => {}); }, []);

  // Auto-refresh every 30s when any live match exists
  const hasLive = useMemo(() => allMatches.some((m) => m.status === 'live'), [allMatches]);
  useEffect(() => {
    if (!hasLive) return;
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [hasLive]);

  const groups = useMemo(() => groupByDate(allMatches), [allMatches]);

  // Scroll to today on first load
  useEffect(() => {
    if (loading || groups.length === 0 || didScroll.current) return;
    didScroll.current = true;
    const today = toDateString(new Date());
    // Find the closest date (today or next upcoming)
    let targetDate = groups[groups.length - 1].date;
    for (const g of groups) {
      if (g.date >= today) { targetDate = g.date; break; }
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(`date-${targetDate}`);
      if (el && scrollRef.current) {
        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        scrollRef.current.scrollTop += elTop - containerTop - 8;
      }
    });
  }, [loading, groups]);

  // Floating label on scroll
  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Find which date section is in view
    const headers = container.querySelectorAll<HTMLElement>('[data-date]');
    let current = '';
    const containerTop = container.getBoundingClientRect().top;
    for (const header of headers) {
      const top = header.getBoundingClientRect().top - containerTop;
      if (top <= 40) current = header.dataset.date!;
      else break;
    }

    if (current) {
      const [, m, d] = current.split('-');
      setFloatingLabel(`${d}.${m}`);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setFloatingLabel(''), 1200);
    }
  }, []);

  function jumpToDate(date: string) {
    const el = document.getElementById(`date-${date}`);
    if (el && scrollRef.current) {
      const containerTop = scrollRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      scrollRef.current.scrollTop += elTop - containerTop - 8;
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">⚽ מונדיאל 2026</h1>
          <div className="flex items-center gap-3">
            {profile && <span className="text-accent-exact font-bold score-font text-sm">{profile.totalPoints} נק׳</span>}
            <button
              onClick={() => setCalendarOpen(true)}
              className="w-8 h-8 grid place-items-center rounded-full bg-bg-elevated text-text-secondary hover:text-text-primary"
              aria-label="בחר תאריך"
            >
              <CalendarIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Floating date label */}
      {floatingLabel && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 bg-bg-elevated/90 backdrop-blur text-text-primary text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-border-subtle pointer-events-none transition-opacity">
          {floatingLabel}
        </div>
      )}

      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3" onScroll={handleScroll}>
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && groups.map((group) => (
          <div key={group.date} id={`date-${group.date}`} data-date={group.date}>
            <div className="sticky top-0 z-[5] bg-bg-base/80 backdrop-blur-sm py-1.5 mb-2 mt-3 first:mt-0">
              <span className="text-text-muted text-xs font-medium">{group.label}</span>
            </div>
            <div className="space-y-2">
              {group.matches.map((m) => (
                <MatchCard key={m.id} match={m} onGuessClick={setGuessMatch} />
              ))}
            </div>
          </div>
        ))}
      </main>

      <CalendarSheet
        open={calendarOpen}
        selected={toDateString(new Date())}
        onSelect={(date) => { jumpToDate(date); setCalendarOpen(false); }}
        onClose={() => setCalendarOpen(false)}
      />
      <GuessSheet match={guessMatch} onClose={() => setGuessMatch(null)} onSubmitted={() => load()} />
      <BottomNav />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4H16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1.25V2.75A.75.75 0 0 1 5.75 2ZM4 7.5v8.5h12V7.5H4Z" clipRule="evenodd" />
    </svg>
  );
}
