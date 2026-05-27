import { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { BackHeader } from '../components/BackHeader';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { athletePhoto, teamLogo } from '../lib/logos';
import { showBackButton } from '../lib/telegram';
import type { SquadPlayer, TeamDetailResponse } from '../types';

const POSITION_ORDER: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'GK', label: 'שוערים' },
  { key: 'DF', label: 'הגנה' },
  { key: 'MF', label: 'קישור' },
  { key: 'FW', label: 'התקפה' },
];

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
        <main className="p-4 space-y-5">
          <section className="flex items-center gap-4">
            <img src={teamLogo(data.team.id, 96)} alt="" className="w-20 h-20 rounded-xl bg-bg-elevated object-contain" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-text-primary truncate">{data.team.name}</h1>
              {data.country && <div className="text-sm text-text-secondary mt-0.5">{data.country}</div>}
            </div>
          </section>

          {data.squad.length === 0 && <EmptyState title="אין סגל זמין" />}

          {POSITION_ORDER.map(({ key, label }) =>
            grouped[key].length === 0 ? null : (
              <section key={key} className="space-y-2">
                <h2 className="text-xs uppercase tracking-wide text-text-secondary">{label}</h2>
                <ul className="bg-bg-elevated rounded-xl overflow-hidden divide-y divide-border-subtle">
                  {grouped[key].map((p) => (
                    <li key={p.athleteId}>
                      <button
                        onClick={() => navigate(`/athlete/${p.athleteId}`)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-bg-base/40 transition-colors text-right"
                      >
                        <img src={athletePhoto(p.athleteId, 56)} alt="" className="w-10 h-10 rounded-full bg-bg-base object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary truncate">{p.name}</div>
                          {p.positionName && <div className="text-xs text-text-secondary">{p.positionName}</div>}
                        </div>
                        {p.jerseyNumber !== undefined && (
                          <div className="text-text-secondary text-sm w-7 text-center">#{p.jerseyNumber}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </main>
      )}
    </div>
  );
}
