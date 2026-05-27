import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { BackHeader } from '../components/BackHeader';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { athletePhoto, teamLogo } from '../lib/logos';
import { showBackButton } from '../lib/telegram';
import type { AthleteDetailResponse } from '../types';

const POSITION_LABEL: Record<string, string> = {
  GK: 'שוער',
  DF: 'מגן',
  MF: 'קשר',
  FW: 'חלוץ',
};

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3">
      <span className="text-text-secondary text-sm">{label}</span>
      <span className="text-text-primary text-sm">{value}</span>
    </div>
  );
}

export function PlayerDetailPage() {
  const [, params] = useRoute('/athlete/:id');
  const [, navigate] = useLocation();
  const [data, setData] = useState<AthleteDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  const goBack = () => window.history.back();

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    setData(null);
    setError(null);
    api.athlete(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(goBack), []);

  return (
    <div className="min-h-full bg-bg-base">
      <BackHeader
        onBack={goBack}
        title={data ? <span className="text-text-primary text-sm font-medium truncate">{data.name}</span> : undefined}
      />

      {error && <EmptyState title="לא הצלחתי לטעון" hint={error} />}
      {!error && !data && <EmptyState title="טוען..." />}

      {data && (
        <main className="p-4 space-y-5">
          <section className="flex flex-col items-center text-center">
            <img src={athletePhoto(data.athleteId, 160)} alt="" className="w-28 h-28 rounded-full bg-bg-elevated object-cover" />
            <h1 className="mt-3 text-xl font-semibold text-text-primary">{data.name}</h1>
            <div className="text-sm text-text-secondary mt-1">
              {POSITION_LABEL[data.position] ?? data.positionName ?? '—'}
              {data.jerseyNumber !== undefined && <span> · #{data.jerseyNumber}</span>}
            </div>
          </section>

          <section className="bg-bg-elevated rounded-xl divide-y divide-border-subtle">
            {data.positionName && <InfoRow label="עמדה" value={data.positionName} />}
            {data.age !== undefined && <InfoRow label="גיל" value={data.age} />}
            {data.height !== undefined && <InfoRow label="גובה" value={`${data.height} ס״מ`} />}
            {data.jerseyNumber !== undefined && <InfoRow label="חולצה" value={`#${data.jerseyNumber}`} />}
            {data.nationalityName && <InfoRow label="לאום" value={data.nationalityName} />}
          </section>

          {data.clubId !== undefined && (
            <section>
              <h2 className="text-xs uppercase tracking-wide text-text-secondary mb-2">קבוצה</h2>
              <button
                onClick={() => navigate(`/team/${data.clubId}`)}
                className="w-full flex items-center gap-3 p-3 bg-bg-elevated rounded-xl hover:bg-bg-base/40 transition-colors text-right"
              >
                <img src={teamLogo(data.clubId, 56)} alt="" className="w-10 h-10 rounded-lg bg-bg-base object-contain" />
                <div className="flex-1 min-w-0 text-text-primary truncate">{data.clubName ?? 'מעבר לדף הקבוצה'}</div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
