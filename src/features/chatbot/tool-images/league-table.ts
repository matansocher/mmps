import type { CompetitionTableToolResult, CompetitionTableToolRow } from '@shared/ai/tools';
import { detectLanguage } from '@shared/image-card';
import type { ToolResult } from '../types';
import { generateLeagueTableImage } from './league-table-image';
import type { ToolImageBuilder } from './types';

const TABLE_TOOL_NAME = 'competition_table';
const MAX_HIGHLIGHTED_TEAMS = 3;

const normalize = (text: string) => text.toLowerCase().replace(/['"`׳״]/g, '');

export function selectLeagueTable(toolResults: readonly ToolResult[]): CompetitionTableToolResult | null {
  const tableResult = [...toolResults].reverse().find((result) => result.toolName === TABLE_TOOL_NAME && Array.isArray(result.data?.table) && result.data.table.length);
  return tableResult?.data ?? null;
}

// The leader is usually mentioned in every reply, so it is highlighted only when no other team is mentioned.
export function selectHighlightedPositions(rows: readonly CompetitionTableToolRow[], replyText: string): number[] {
  const reply = normalize(replyText);
  const mentioned = rows.filter((row) => row.team && reply.includes(normalize(row.team)));
  const others = mentioned.filter((row) => row.position !== rows[0]?.position);
  return (others.length ? others : mentioned).slice(0, MAX_HIGHLIGHTED_TEAMS).map((row) => row.position);
}

export async function buildLeagueTableImage(toolResults: readonly ToolResult[], replyText: string): Promise<Buffer | null> {
  const table = selectLeagueTable(toolResults);
  if (!table) {
    return null;
  }
  return generateLeagueTableImage({
    competition: table.competition,
    rows: table.table,
    highlightedPositions: selectHighlightedPositions(table.table, replyText),
    language: detectLanguage(replyText),
  });
}

export const LEAGUE_TABLE_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: TABLE_TOOL_NAME,
  fileName: 'league-table.png',
  build: buildLeagueTableImage,
};
