import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { MatchDto, ProfileDto } from '../lib/types';
import { toDateString } from '../lib/dates';
import { MatchCard } from '../components/MatchCard';
import { DayPicker } from '../components/DayPicker';
import { GuessSheet } from '../components/GuessSheet';
import { BottomNav } from '../components/BottomNav';

function getMatchDate(m: MatchDto): string {
  const d = new Date(m.startTime);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')!.value;
  const mo = parts.find((p) => p.type === 'month')!.value;
  const da = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${mo}-${da}`;
}

function getNextMatchDays(matches: MatchDto[]): string[] {
  const today = toDateString(new Date());
  const futureDays = new Set<string>();
  for (const m of matches) {
    const day = getMatchDate(m);
    if (day >= today) futureDays.add(day);
  }
  return [...futureDays].sort().slice(0, 2);
}

export function MatchesPage() {
  const [allMatches, setAllMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [guessMatch, setGuessMatch] = useState<MatchDto | null>(null);
  const [profile, setProfile] = useState<ProfileDto | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.matches();
      setAllMatches(data.matches);
    } catch {
      setAllMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    api.profile().then(setProfile).catch(() => {});
  }, []);

  const matchDays = useMemo(() => getNextMatchDays(allMatches), [allMatches]);

  useEffect(() => {
    if (matchDays.length > 0 && !selectedDate) {
      setSelectedDate(matchDays[0]);
    }
  }, [matchDays]);

  const filteredMatches = useMemo(() => {
    if (!selectedDate) return [];
    return allMatches.filter((m) => getMatchDate(m) === selectedDate);
  }, [allMatches, selectedDate]);

  function handleGuessSubmitted() {
    load();
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">⚽ מונדיאל 2026</h1>
          {profile && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-secondary">{profile.guessCount} ניחושים</span>
              <span className="text-accent-exact font-bold score-font text-sm">{profile.totalPoints} נק׳</span>
            </div>
          )}
        </div>
        <DayPicker matchDays={matchDays} selectedDate={selectedDate} onSelectDate={handleDateSelect} />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && <p className="text-text-muted text-center py-8">טוען...</p>}
        {!loading && filteredMatches.length === 0 && <p className="text-text-muted text-center py-8">אין משחקים ביום זה</p>}
        {!loading && filteredMatches.map((m) => (
          <MatchCard key={m.id} match={m} onGuessClick={setGuessMatch} />
        ))}
      </main>

      <GuessSheet match={guessMatch} onClose={() => setGuessMatch(null)} onSubmitted={handleGuessSubmitted} />
      <BottomNav />
    </div>
  );
}
