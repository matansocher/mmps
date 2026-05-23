import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { H2HDto } from '../lib/types';

type Props = {
  matchId: number;
  homeName: string;
  awayName: string;
};

const STAT_NAMES_HE: Record<string, string> = {
  'Won The Game': 'ניצחון',
  'Both Teams To Score': 'שתי הקבוצות כובשות',
  'Over 2.5 Goals': 'מעל 2.5 שערים',
  'Scored First': 'כבשה ראשונה',
  'Conceded First': 'ספגה ראשונה',
  'Win Or Draw': 'ניצחון או תיקו',
  '1st Half Winner': 'ניצחון במחצית ראשונה',
  'Clean Sheet': 'רשת נקייה',
  'Goals Scored': 'שערים',
  'Goals Conceded': 'שערים שנספגו',
  'Expected Goals': 'שערים צפויים (xG)',
  'Expected Goals Conceded': 'xG שנספגו',
  'Shots': 'בעיטות',
  'Shots On Target': 'בעיטות למסגרת',
  'Corners': 'קרנות',
  'Cards': 'כרטיסים',
  'Penalties Scored/Taken': 'פנדלים',
};

export function H2HSection({ matchId, homeName, awayName }: Props) {
  const [data, setData] = useState<H2HDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.matchH2H(matchId).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return <div className="text-text-muted text-center py-4 text-xs">טוען נתונים...</div>;
  if (!data) return null;

  const hasContent = data.teamStats.length > 0 || data.communityPrediction.home > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      {/* Community Prediction */}
      {(data.communityPrediction.home > 0 || data.communityPrediction.draw > 0 || data.communityPrediction.away > 0) && (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
          <h3 className="text-xs text-text-secondary mb-3">📊 ניחושי הקהילה</h3>
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="flex-1 text-center font-medium">{homeName}</span>
            <span className="text-text-muted">תיקו</span>
            <span className="flex-1 text-center font-medium">{awayName}</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden">
            {data.communityPrediction.home > 0 && (
              <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${data.communityPrediction.home}%` }}>
                <span className="text-[10px] text-white font-bold">{data.communityPrediction.home}%</span>
              </div>
            )}
            {data.communityPrediction.draw > 0 && (
              <div className="bg-gray-400 flex items-center justify-center" style={{ width: `${data.communityPrediction.draw}%` }}>
                <span className="text-[10px] text-white font-bold">{data.communityPrediction.draw}%</span>
              </div>
            )}
            {data.communityPrediction.away > 0 && (
              <div className="bg-red-500 flex items-center justify-center" style={{ width: `${data.communityPrediction.away}%` }}>
                <span className="text-[10px] text-white font-bold">{data.communityPrediction.away}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Stats Comparison */}
      {data.teamStats.length > 0 && (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
          <h3 className="text-xs text-text-secondary mb-1">📈 סטטיסטיקות</h3>
          {data.gamesPlayed && <p className="text-[10px] text-text-muted mb-3">{data.gamesPlayed}</p>}
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-2 px-1">
            <span>{homeName}</span>
            <span>{awayName}</span>
          </div>
          <div className="space-y-2">
            {data.teamStats.map((stat, i) => (
              <StatRow key={i} name={STAT_NAMES_HE[stat.name] || stat.name} homeValue={stat.homeValue} awayValue={stat.awayValue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ name, homeValue, awayValue }: { name: string; homeValue: string; awayValue: string }) {
  return (
    <div className="flex items-center text-xs">
      <span className="w-14 text-left font-medium text-text-primary">{homeValue}</span>
      <span className="flex-1 text-center text-text-secondary text-[10px]">{name}</span>
      <span className="w-14 text-right font-medium text-text-primary">{awayValue}</span>
    </div>
  );
}
