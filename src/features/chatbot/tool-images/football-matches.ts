import { detectLanguage } from '@shared/image-card';
import { generateMatchCardsImage } from '@shared/sports';
import type { MatchCard, MatchCardGroup } from '@shared/sports';
import type { ToolResult } from '../types';
import type { ToolImageBuilder } from './types';

export const COMPETITION_MATCHES_TOOL_NAME = 'competition_matches';
export const MATCH_SUMMARY_TOOL_NAME = 'match_summary';

// Merges every call of the given tools into one list of competition groups, skipping duplicate matches.
export function collectMatchCardGroups(toolResults: readonly ToolResult[], toolNames: readonly string[]): MatchCardGroup[] {
  const groups = new Map<string, MatchCard[]>();
  const seen = new Set<number>();
  for (const result of toolResults) {
    if (!toolNames.includes(result.toolName) || result.error || !Array.isArray(result.data?.competitions)) continue;
    for (const group of result.data.competitions as MatchCardGroup[]) {
      if (!Array.isArray(group?.matches)) continue;
      const matches = groups.get(group.competition) ?? [];
      for (const match of group.matches) {
        if (seen.has(match.id)) continue;
        seen.add(match.id);
        matches.push(match);
      }
      groups.set(group.competition, matches);
    }
  }
  return [...groups.entries()].filter(([, matches]) => matches.length).map(([competition, matches]) => ({ competition, matches }));
}

const MAX_FOCUSED_MATCHES = 3;

// A reply naming only a few teams is a focused question ("when does X play?"), so the image shows just those matches.
// Otherwise the reply is a summary of highlights and the image shows every match.
export function selectMatchCardGroups(groups: readonly MatchCardGroup[], replyText: string): MatchCardGroup[] {
  const isMentioned = (match: MatchCard) => replyText.includes(match.home) || replyText.includes(match.away);
  const mentioned = groups.map((group) => ({ ...group, matches: group.matches.filter(isMentioned) })).filter((group) => group.matches.length);
  const mentionedCount = mentioned.reduce((sum, group) => sum + group.matches.length, 0);
  return mentionedCount > 0 && mentionedCount <= MAX_FOCUSED_MATCHES ? mentioned : [...groups];
}

function buildFootballMatchesImage(toolName: string, focusOnMentioned: boolean) {
  return (toolResults: readonly ToolResult[], replyText: string): Buffer | null => {
    const allGroups = collectMatchCardGroups(toolResults, [toolName]);
    const groups = focusOnMentioned ? selectMatchCardGroups(allGroups, replyText) : allGroups;
    if (!groups.length) {
      return null;
    }
    return generateMatchCardsImage(groups, detectLanguage(replyText));
  };
}

export const COMPETITION_MATCHES_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: COMPETITION_MATCHES_TOOL_NAME,
  fileName: 'football-fixtures.png',
  build: buildFootballMatchesImage(COMPETITION_MATCHES_TOOL_NAME, true),
};

export const MATCH_SUMMARY_IMAGE_BUILDER: ToolImageBuilder = {
  toolName: MATCH_SUMMARY_TOOL_NAME,
  fileName: 'football-matches.png',
  // The day's summary always shows every match, since the reply only names the highlights.
  build: buildFootballMatchesImage(MATCH_SUMMARY_TOOL_NAME, false),
};
