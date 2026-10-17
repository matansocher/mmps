import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { PageHeader } from '../components/PageHeader';
import { TeamLogo } from '../components/TeamLogo';
import { Loading } from '../components/ui';
import { useDashboard } from '../hooks/useDashboard';
import { api } from '../lib/api';
import { EVENT_META, EVENT_TYPE_ORDER } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import { hapticSelect } from '../lib/telegram';
import type { CompetitionOption, EventType, FavoriteTeam, Preferences, TeamOption } from '../types';
import { Icon } from '../components/Icon';

const MAX_FAVORITE_TEAMS = 30;
const REFRESH_INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 120] as const;
const DEFAULT_REFRESH_INTERVAL_SEC = 30;

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
        placeholder="Search a team (e.g. Maccabi Haifa, Arsenal)"
        className="w-full rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-accent-brand"
      />
      {searching && <p className="text-xs text-text-muted">Searching…</p>}
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
                  <span className="text-xs text-accent-brand">{added ? 'Added' : '+ Add'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatInterval(sec: number): string {
  return sec < 60 ? `${sec}s` : `${sec / 60} min`;
}

export function SettingsPage() {
  const { refresh } = useDashboard();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(false);
    try {
      setPrefs(await api.savePreferences(prefs));
      setDirty(false);
      setSaved(true);
      refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const interval = prefs?.refreshIntervalSec ?? DEFAULT_REFRESH_INTERVAL_SEC;

  return (
    <div className="min-h-screen pb-40 md:pb-28">
      <PageHeader title="Settings" subtitle="What shows up on your live dashboard" />

      {error && <p className="mx-auto mt-4 max-w-2xl px-4 text-sm text-accent-red">Something went wrong, please try again</p>}
      {!prefs && !error && <Loading />}

      {prefs && (
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-4">
          <Card title="Leagues" subtitle="Today's games from these leagues appear on the dashboard">
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
                    <span className={`flex rounded-full ${on ? 'bg-bg-base/70 p-0.5' : ''}`}>
                      <CompetitionLogo competitionId={c.id} size={on ? 14 : 16} />
                    </span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="My teams" subtitle="Listed first in each section, and shown even when their league isn't selected">
            {prefs.favoriteTeams.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {prefs.favoriteTeams.map((team) => (
                  <li key={team.id} className="flex items-center gap-1.5 rounded-full bg-bg-elevated py-1 ps-1.5 pe-2 text-xs">
                    <TeamLogo teamId={team.id} name={team.name} size={18} />
                    {team.name}
                    <button
                      onClick={() => update({ ...prefs, favoriteTeams: prefs.favoriteTeams.filter((t) => t.id !== team.id) })}
                      aria-label={`Remove ${team.name}`}
                      className="ms-1 text-text-muted hover:text-accent-red"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <TeamSearch favorites={prefs.favoriteTeams} onAdd={(team) => update({ ...prefs, favoriteTeams: [...prefs.favoriteTeams, team] })} />
          </Card>

          <Card title="Notifications" subtitle="Which events pop up as notifications. Game cards always show goals, red cards, missed penalties and VAR.">
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPE_ORDER.map((type: EventType) => {
                const on = prefs.eventTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => update({ ...prefs, eventTypes: toggle(prefs.eventTypes, type) })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${on ? 'border-accent-brand bg-accent-brand/10 text-text-primary' : 'border-border-subtle text-text-muted'}`}
                  >
                    <Icon name={EVENT_META[type].icon} size={16} />
                    <span className="flex-1 text-start">{EVENT_META[type].label}</span>
                    <span className={`size-4 rounded border ${on ? 'border-accent-brand bg-accent-brand' : 'border-text-muted'}`} />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Refresh interval" subtitle="How often the dashboard checks for new events">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {REFRESH_INTERVAL_OPTIONS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => update({ ...prefs, refreshIntervalSec: sec })}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${interval === sec ? 'border-accent-brand bg-accent-brand/10 text-text-primary' : 'border-border-subtle text-text-muted'}`}
                >
                  {formatInterval(sec)}
                </button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-text-muted">
              ℹ️ Minimum is 15 seconds. 365Scores doesn't publish a rate limit, but live data is cached on the server for about 15 seconds, so refreshing faster wouldn't show anything newer.
            </p>
          </Card>
        </main>
      )}

      {prefs && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-border-subtle bg-bg-base/95 p-3 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={save}
              disabled={!dirty || saving || prefs.competitionIds.length + prefs.favoriteTeams.length === 0}
              className="w-full rounded-xl bg-accent-brand py-3 text-sm font-bold transition disabled:opacity-40"
            >
              {saving ? 'Saving…' : saved && !dirty ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
