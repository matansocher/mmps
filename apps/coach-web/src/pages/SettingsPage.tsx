import { type ReactNode, useEffect, useRef, useState } from 'react';
import { TeamLogo } from '../components/TeamLogo';
import { api } from '../lib/api';
import { EVENT_META, EVENT_TYPE_ORDER } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import { hapticSelect, showBackButton } from '../lib/telegram';
import type { CompetitionOption, EventType, FavoriteTeam, Preferences, TeamOption } from '../types';

const MAX_FAVORITE_TEAMS = 30;

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Card({ title, subtitle, children }: { readonly title: string; readonly subtitle?: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-bg-card p-4">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TeamSearch({ favorites, onAdd }: { readonly favorites: FavoriteTeam[]; readonly onAdd: (team: FavoriteTeam) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeamOption[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const found = await api.searchTeams(q);
        if (id === requestId.current) setResults(found);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const favoriteIds = new Set(favorites.map((f) => f.id));
  return (
    <div className="flex flex-col gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חפש קבוצה (למשל: מכבי חיפה, Arsenal)"
        className="w-full rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-accent-brand"
      />
      {searching && <p className="text-xs text-text-muted">מחפש…</p>}
      {results.length > 0 && (
        <ul className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border-subtle">
          {results.map((team) => {
            const added = favoriteIds.has(team.id);
            return (
              <li key={team.id}>
                <button
                  disabled={added || favorites.length >= MAX_FAVORITE_TEAMS}
                  onClick={() => {
                    onAdd({ id: team.id, name: team.name });
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm hover:bg-bg-elevated disabled:opacity-50"
                >
                  <TeamLogo teamId={team.id} name={team.name} size={20} />
                  <span className="flex-1 truncate">{team.name}</span>
                  <span className="text-xs text-accent-brand">{added ? 'נוסף' : '+ הוסף'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SettingsPage({ onBack }: { readonly onBack: () => void }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => showBackButton(onBack), [onBack]);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([api.preferences(), api.competitions()]);
        setPrefs(p);
        setCompetitions(c);
      } catch {
        setError(true);
      }
    })();
  }, []);

  const update = (next: Preferences) => {
    hapticSelect();
    setPrefs(next);
    setDirty(true);
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      setPrefs(await api.savePreferences(prefs));
      setDirty(false);
      onBack();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-base/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="text-sm text-accent-brand">
            → חזרה
          </button>
          <h1 className="flex-1 text-center text-base font-bold">הגדרות דשבורד</h1>
          <span className="w-12" />
        </div>
      </header>

      {error && <p className="mx-auto mt-4 max-w-2xl px-4 text-sm text-accent-live">משהו השתבש, נסה שוב</p>}
      {!prefs && !error && <p className="mt-16 text-center text-sm text-text-muted">טוען…</p>}

      {prefs && (
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-4">
          <Card title="ליגות" subtitle="משחקי היום בליגות האלה יופיעו בדשבורד">
            <div className="flex flex-wrap gap-2">
              {competitions.map((c) => {
                const on = prefs.competitionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => update({ ...prefs, competitionIds: toggle(prefs.competitionIds, c.id) })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? 'border-transparent text-white' : 'border-border-subtle text-text-secondary'}`}
                    style={on ? { backgroundColor: leagueColor(c.id) } : undefined}
                  >
                    <span>{c.icon}</span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="הקבוצות שלי" subtitle="מוצמדות למעלה ומוצגות גם אם הליגה שלהן לא נבחרה">
            {prefs.favoriteTeams.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {prefs.favoriteTeams.map((team) => (
                  <li key={team.id} className="flex items-center gap-1.5 rounded-full bg-bg-elevated py-1 ps-1.5 pe-2 text-xs">
                    <TeamLogo teamId={team.id} name={team.name} size={18} />
                    {team.name}
                    <button
                      onClick={() => update({ ...prefs, favoriteTeams: prefs.favoriteTeams.filter((t) => t.id !== team.id) })}
                      aria-label={`הסר ${team.name}`}
                      className="ms-1 text-text-muted hover:text-accent-live"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <TeamSearch favorites={prefs.favoriteTeams} onAdd={(team) => update({ ...prefs, favoriteTeams: [...prefs.favoriteTeams, team] })} />
          </Card>

          <Card title="אירועים להצגה" subtitle="מה יופיע בכרטיסי המשחקים ובפיד">
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPE_ORDER.map((type: EventType) => {
                const on = prefs.eventTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => update({ ...prefs, eventTypes: toggle(prefs.eventTypes, type) })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${on ? 'border-accent-brand bg-accent-brand/10 text-text-primary' : 'border-border-subtle text-text-muted'}`}
                  >
                    <span>{EVENT_META[type].icon}</span>
                    <span className="flex-1 text-start">{EVENT_META[type].label}</span>
                    <span className={`size-4 rounded border ${on ? 'border-accent-brand bg-accent-brand' : 'border-text-muted'}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        </main>
      )}

      {prefs && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-bg-base/95 p-3 backdrop-blur-md">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={save}
              disabled={!dirty || saving || prefs.competitionIds.length + prefs.favoriteTeams.length === 0}
              className="w-full rounded-xl bg-accent-brand py-3 text-sm font-bold transition disabled:opacity-40"
            >
              {saving ? 'שומר…' : 'שמור'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
