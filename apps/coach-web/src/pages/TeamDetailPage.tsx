import { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { BackHeader } from '../components/BackHeader';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { athletePhoto, teamLogo } from '../lib/logos';
import { showBackButton } from '../lib/telegram';
import type { SquadPlayer, TeamDetailResponse, TeamRecentMatch } from '../types';

const POSITION_ORDER: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'GK', label: 'שוערים' },
  { key: 'DF', label: 'הגנה' },
  { key: 'MF', label: 'קישור' },
  { key: 'FW', label: 'התקפה' },
];

const OUTCOME_STYLE: Record<TeamRecentMatch['outcome'], string> = {
  W: 'bg-accent-win/15 text-accent-win',
  D: 'bg-text-muted/15 text-text-secondary',
  L: 'bg-accent-loss/15 text-accent-loss',
};

const OUTCOME_LABEL: Record<TeamRecentMatch['outcome'], string> = { W: 'נ', D: 'ת', L: 'ה' };

export function TeamDetailPage() {
  const [, params] = useRoute('/team/:id');
  const [, navigate] = useLocation();
  const [data, setData] = useState<TeamDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  const goBack = () => window.history.back();

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    setData(null);
    setError(null);
    api.team(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(goBack), []);

  const grouped = useMemo(() => {
    const map: Record<string, SquadPlayer[]> = { GK: [], DF: [], MF: [], FW: [] };
    if (!data) return map;
    for (const p of data.squad) {
      const key = map[p.position] ? p.position : 'MF';
      map[key].push(p);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
    }
    return map;
  }, [data]);

  return (
    <div className="min-h-full bg-bg-base">
      <BackHeader
        onBack={goBack}
        title={data ? <span className="text-text-primary text-sm font-medium truncate">{data.team.name}</span> : undefined}
      />

      {error && <EmptyState title="לא הצלחתי לטעון" hint={error} />}
      {!error && !data && <EmptyState title="טוען..." />}

      {data && (
        <main className="p-3 space-y-3">
          <TeamHeader data={data} />
          {data.recentMatches.length > 0 && <FormStrip matches={data.recentMatches} onSelect={(mid) => navigate(`/match/${mid}`)} />}
          {data.recentMatches.length > 0 && <RecentMatches matches={data.recentMatches} teamId={data.team.id} onSelect={(mid) => navigate(`/match/${mid}`)} />}
          <SquadSection grouped={grouped} onSelect={(athleteId) => navigate(`/athlete/${athleteId}`)} totalCount={data.squad.length} />
        </main>
      )}
    </div>
  );
}

function TeamHeader({ data }: { data: TeamDetailResponse }) {
  return (
    <section className="bg-bg-card border border-border-subtle rounded-xl p-3">
      <div className="flex items-center gap-3">
        <img src={teamLogo(data.team.id, 96)} alt="" className="w-14 h-14 rounded-lg bg-bg-elevated object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-text-primary truncate">{data.team.name}</h1>
          <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
            {data.country && <span>{data.country}</span>}
            {data.team.symbolicName && <span className="text-text-muted">· {data.team.symbolicName}</span>}
          </div>
        </div>
        {(data.color || data.awayColor) && (
          <div className="flex flex-col gap-1 shrink-0" title="צבעי הקבוצה">
            {data.color && <ColorSwatch color={data.color} />}
            {data.awayColor && <ColorSwatch color={data.awayColor} />}
          </div>
        )}
      </div>
    </section>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return <span className="block w-4 h-4 rounded-sm border border-border-subtle" style={{ background: color }} />;
}

function FormStrip({ matches, onSelect }: { matches: readonly TeamRecentMatch[]; onSelect: (matchId: number) => void }) {
  return (
    <section className="bg-bg-card border border-border-subtle rounded-xl p-3 flex items-center justify-between gap-3">
      <h2 className="text-xs uppercase tracking-wide text-text-secondary shrink-0">פורמה</h2>
      <div className="flex items-center gap-1.5">
        {[...matches].reverse().map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center ${OUTCOME_STYLE[m.outcome]}`}
            title={`${m.home.name} ${m.score?.home}-${m.score?.away} ${m.away.name}`}
          >
            {OUTCOME_LABEL[m.outcome]}
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentMatches({ matches, teamId, onSelect }: { matches: readonly TeamRecentMatch[]; teamId: number; onSelect: (matchId: number) => void }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-xs uppercase tracking-wide text-text-secondary px-1">תוצאות אחרונות</h2>
      <ul className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
        {matches.map((m) => {
          const isHome = m.home.id === teamId;
          const opponent = isHome ? m.away : m.home;
          const date = new Date(m.startTime).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
          return (
            <li key={m.id}>
              <button onClick={() => onSelect(m.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors">
                <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${OUTCOME_STYLE[m.outcome]}`}>
                  {OUTCOME_LABEL[m.outcome]}
                </span>
                <img src={teamLogo(opponent.id, 32)} alt="" className="w-5 h-5 shrink-0" loading="lazy" />
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xs text-text-primary truncate">{opponent.name}</div>
                  <div className="text-[10px] text-text-muted">{isHome ? 'בית' : 'חוץ'} · {date}</div>
                </div>
                {m.score && (
                  <span className="score-font text-sm text-text-primary tabular-nums shrink-0">
                    {isHome ? m.score.home : m.score.away}-{isHome ? m.score.away : m.score.home}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SquadSection({ grouped, onSelect, totalCount }: { grouped: Record<string, SquadPlayer[]>; onSelect: (athleteId: number) => void; totalCount: number }) {
  if (totalCount === 0) return <EmptyState title="אין סגל זמין" />;

  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-text-secondary px-1">סגל ({totalCount})</h2>
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        {POSITION_ORDER.map(({ key, label }, idx) =>
          grouped[key].length === 0 ? null : (
            <div key={key} className={idx > 0 ? 'border-t border-border-subtle' : ''}>
              <div className="px-3 py-1.5 bg-bg-elevated/40 text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
              <ul className="divide-y divide-border-subtle">
                {grouped[key].map((p) => (
                  <li key={p.athleteId}>
                    <button onClick={() => onSelect(p.athleteId)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-bg-elevated transition-colors text-right">
                      <img src={athletePhoto(p.athleteId, 40)} alt="" className="w-7 h-7 rounded-full bg-bg-base object-cover shrink-0" loading="lazy" />
                      {p.jerseyNumber !== undefined && (
                        <span className="score-font text-text-muted text-[11px] w-5 text-center shrink-0">{p.jerseyNumber}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-text-primary text-xs truncate">{p.name}</div>
                        {p.positionName && <div className="text-text-muted text-[10px] truncate">{p.positionName}</div>}
                      </div>
                      {p.age !== undefined && <span className="text-text-muted text-[10px] shrink-0">גיל {p.age}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
