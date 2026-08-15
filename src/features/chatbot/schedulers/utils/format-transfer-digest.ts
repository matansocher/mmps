import type { PendingRumour } from '@shared/transfer-tracker';

// Names the feed reports in full (or in another language) mapped to the short form
// people actually use, so the move column stays narrow enough to read without scrolling.
const CLUB_ALIASES: Record<string, string> = {
  'ac milan': 'Milan',
  'as roma': 'Roma',
  'atlético de madrid': 'Atlético',
  'atletico de madrid': 'Atlético',
  'atlético madrid': 'Atlético',
  'atletico madrid': 'Atlético',
  barca: 'Barcelona',
  barça: 'Barcelona',
  'bayer leverkusen': 'Leverkusen',
  'borussia dortmund': 'Dortmund',
  'borussia mönchengladbach': 'Gladbach',
  'brighton and hove albion': 'Brighton',
  bvb: 'Dortmund',
  'colorado rapids': 'Colorado',
  'crystal palace': 'Palace',
  'fc barcelona': 'Barcelona',
  'fc bayern münchen': 'Bayern',
  'bayern münchen': 'Bayern',
  'inter miami': 'Miami',
  lione: 'Lyon',
  'losc lille': 'Lille',
  'manchester city': 'Man City',
  'manchester united': 'Man Utd',
  'newcastle united': 'Newcastle',
  'nottingham forest': "Nott'm Forest",
  ol: 'Lyon',
  'olympique lyonnais': 'Lyon',
  'olympique marseille': 'Marseille',
  'paris saint germain': 'PSG',
  'paris saint-germain': 'PSG',
  'real salt lake': 'Salt Lake',
  'sporting cp': 'Sporting',
  'tottenham hotspur': 'Tottenham',
  'union saint-gilloise': 'Union SG',
  'west ham united': 'West Ham',
  'wolverhampton wanderers': 'Wolves',
};

// Sections in the order a reader cares about: done deals first, speculation last.
const SECTIONS: readonly { readonly status: string; readonly label: string }[] = [
  { status: 'confirmed', label: '✅ Confirmed' },
  { status: 'agreed', label: '🤝 Agreed' },
  { status: 'imminent', label: '⏳ Imminent' },
  { status: 'rumour', label: '💬 Rumours' },
  { status: 'collapsed', label: '❌ Collapsed' },
];

const FALLBACK_MAX_LENGTH = 3900;

export function shortClubName(name: string | null): string {
  if (!name) {
    return '?';
  }
  const alias = CLUB_ALIASES[name.toLowerCase().trim()];
  if (alias) {
    return alias;
  }
  // Strip the club-type prefixes and suffixes that add width but no meaning.
  return name
    .replace(/^(FC|AC|AS|SS|SC|CF|RC|CD|SV|VfL|VfB|1\.)\s+/i, '')
    .replace(/\s+(FC|CF|SC)$/i, '')
    .trim();
}

// Fee ranges such as "£144.5m–£201.2m" are the widest cells in the table; show the
// lower bound only, which is the figure being quoted anyway.
export function shortFee(rumour: Pick<PendingRumour, 'feeLabel' | 'marketValueEur'>): string {
  const { feeLabel, marketValueEur } = rumour;
  if (feeLabel) {
    if (/loan/i.test(feeLabel)) {
      return 'Loan';
    }
    if (/free/i.test(feeLabel)) {
      return 'Free';
    }
    const firstFigure = feeLabel.match(/[£€$]\s?[\d.]+\s?[mk]?/i);
    if (firstFigure) {
      return firstFigure[0].replace(/\s/g, '');
    }
    return feeLabel;
  }
  if (marketValueEur) {
    return `€${Math.round(marketValueEur / 1_000_000)}M`;
  }
  return '-';
}

// Table cells take inline content only, so collapse whitespace and escape pipes.
function cell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}

function playerCell(rumour: PendingRumour): string {
  const name = rumour.playerName ?? 'Unknown';
  return rumour.sourceUrl ? `[${cell(name)}](${rumour.sourceUrl})` : cell(name);
}

function row(rumour: PendingRumour): string {
  const move = `${shortClubName(rumour.fromClub)} → ${shortClubName(rumour.toClub)}`;
  return `| ${playerCell(rumour)} | ${cell(move)} | ${cell(shortFee(rumour))} | ${rumour.probability}% |`;
}

function sortedGroup(rumours: readonly PendingRumour[], status: string): PendingRumour[] {
  return rumours
    .filter((rumour) => rumour.status === status)
    .sort((a, b) => b.probability - a.probability || (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0));
}

// Groups rumours into one table per deal stage. Status becomes a section heading rather
// than a column, which is what keeps the table narrow enough to fit on a phone.
export function formatTransferDigest(rumours: readonly PendingRumour[]): string {
  const sections = SECTIONS.map(({ status, label }) => ({ label, group: sortedGroup(rumours, status) }))
    .filter(({ group }) => group.length > 0)
    .map(({ label, group }) => [`**${label}**`, '', '| Player | Move | Fee | % |', '|:--|:--|--:|--:|', ...group.map(row)].join('\n'));

  // Any unexpected status still gets reported rather than silently dropped.
  const known = new Set(SECTIONS.map(({ status }) => status));
  const other = rumours.filter((rumour) => !known.has(rumour.status));
  if (other.length) {
    sections.push([`**📌 Other**`, '', '| Player | Move | Fee | % |', '|:--|:--|--:|--:|', ...other.map(row)].join('\n'));
  }

  return [`**Transfer news** ⚽️ (${rumours.length})`, ...sections].join('\n\n');
}

function fallbackRow(rumour: PendingRumour): string {
  const player = (rumour.playerName ?? 'Unknown').replace(/\s+/g, ' ').trim();
  const move = `${shortClubName(rumour.fromClub)} → ${shortClubName(rumour.toClub)}`;
  return `• ${player} · ${rumour.probability}% · ${shortFee(rumour)}\n  ${move}`;
}

// Standard Telegram messages do not support Markdown tables. If rich messages are
// unavailable, render compact two-line cards and split safely below Telegram's limit.
export function formatTransferDigestFallback(rumours: readonly PendingRumour[]): string[] {
  const title = `Transfer news ⚽️ (${rumours.length})`;
  const chunks: string[] = [];
  let current = title;

  const append = (text: string, continuationHeading?: string): void => {
    if (`${current}\n\n${text}`.length <= FALLBACK_MAX_LENGTH) {
      current += `\n\n${text}`;
      return;
    }
    chunks.push(current);
    current = `${title} — continued${continuationHeading ? `\n\n${continuationHeading}` : ''}\n\n${text}`;
  };

  for (const { status, label } of SECTIONS) {
    const group = sortedGroup(rumours, status);
    if (!group.length) {
      continue;
    }
    const heading = `${label} (${group.length})`;
    append(heading);
    for (const rumour of group) {
      append(fallbackRow(rumour), `${heading} — continued`);
    }
  }

  const known = new Set(SECTIONS.map(({ status }) => status));
  const other = rumours.filter((rumour) => !known.has(rumour.status));
  if (other.length) {
    const heading = `📌 Other (${other.length})`;
    append(heading);
    for (const rumour of other) {
      append(fallbackRow(rumour), `${heading} — continued`);
    }
  }

  chunks.push(current);
  return chunks;
}
