import type { MatchSummary } from '../types';

type Props = {
  match: MatchSummary;
  venue?: string;
  channel?: string;
  stage?: string;
};

const DATE_FMT = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const TIME_FMT = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

export function MatchInfo({ match, venue, channel, stage }: Props) {
  const dt = new Date(match.startTime);
  const rows: Array<{ label: string; value: string }> = [
    { label: '📅 תאריך', value: DATE_FMT.format(dt) },
    { label: '🕒 שעה', value: TIME_FMT.format(dt) },
  ];
  if (stage) rows.push({ label: '🏟️ שלב', value: stage });
  if (venue) rows.push({ label: '📍 אצטדיון', value: venue });
  if (channel) rows.push({ label: '📺 שידור', value: channel });

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl divide-y divide-border-subtle">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-4 py-3">
          <span className="text-text-secondary text-sm">{row.label}</span>
          <span className="text-text-primary text-sm font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
