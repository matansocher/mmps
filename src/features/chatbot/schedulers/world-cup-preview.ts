import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getDateString, Logger } from '@core/utils';
import {
  COMPETITION_IDS_MAP,
  getCompetitionMatches,
  getCompetitionTable,
  getMatchTrends,
  getPregameData,
  type CompetitionTableRow,
  type MatchDetails,
} from '@services/scores-365';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('WorldCupPreviewScheduler');

// A "match-day slate" is the cluster of upcoming games that belong together in time.
// Because the World Cup is played in the Americas, a single slate lands in Asia/Jerusalem
// as ~22:00 today + ~01:00 & ~04:00 the next morning — i.e. it spans two calendar dates.
// Games within a slate are a few hours apart; the next slate is ~18h later, so any gap
// larger than SLATE_GAP_MS marks the boundary between slates.
const SLATE_GAP_MS = 8 * 60 * 60 * 1000;
// Only preview a slate when its first game is near (tonight / early tomorrow). If the next
// game is further out than this (e.g. a knockout rest day), skip and let a later run catch it.
const SLATE_LOOKAHEAD_MS = 18 * 60 * 60 * 1000;

function matchStartMs(match: MatchDetails): number {
  return new Date(match.startTime).getTime();
}

// Select the next upcoming night slate: future games only, ordered by kickoff, cut off at the
// first gap larger than SLATE_GAP_MS, and only if the slate begins within SLATE_LOOKAHEAD_MS.
export function selectNightSlate(matches: readonly MatchDetails[], now: Date): MatchDetails[] {
  const nowMs = now.getTime();
  const upcoming = matches.filter((match) => match.startTime && matchStartMs(match) > nowMs).sort((a, b) => matchStartMs(a) - matchStartMs(b));
  if (!upcoming.length || matchStartMs(upcoming[0]) - nowMs > SLATE_LOOKAHEAD_MS) {
    return [];
  }

  const slate: MatchDetails[] = [upcoming[0]];
  for (let i = 1; i < upcoming.length; i++) {
    if (matchStartMs(upcoming[i]) - matchStartMs(upcoming[i - 1]) > SLATE_GAP_MS) {
      break;
    }
    slate.push(upcoming[i]);
  }
  return slate;
}

type StandingEntry = { readonly position: number; readonly team: string; readonly points: number; readonly gamesPlayed: number };

export type MatchDossier = {
  readonly matchId: number;
  readonly stage: string;
  readonly venue: string;
  readonly channel?: string;
  readonly startTime: string;
  readonly kickoff: string; // Format: "YYYY-MM-DD HH:MM" in Asia/Jerusalem local time
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeStanding?: StandingEntry;
  readonly awayStanding?: StandingEntry;
  readonly trends: unknown;
  readonly pregameStats: unknown;
};

function toStanding(rows: readonly CompetitionTableRow[] | undefined, teamName: string): StandingEntry | undefined {
  if (!rows?.length) {
    return undefined;
  }
  const index = rows.findIndex((row) => row.competitor.name === teamName);
  if (index === -1) {
    return undefined;
  }
  const row = rows[index];
  return { position: index + 1, team: row.competitor.name, points: row.points, gamesPlayed: row.gamesPlayed };
}

export async function buildMatchDossier(match: MatchDetails, standingsRows: readonly CompetitionTableRow[] | undefined): Promise<MatchDossier> {
  const [trends, pregameData] = await Promise.all([getMatchTrends(match.id), getPregameData(match.id)]);
  return {
    matchId: match.id,
    stage: match.stage,
    venue: match.venue,
    ...(match.channel ? { channel: match.channel } : {}),
    startTime: match.startTime,
    kickoff: format(toZonedTime(new Date(match.startTime), DEFAULT_TIMEZONE), 'yyyy-MM-dd HH:mm'),
    homeTeam: match.homeCompetitor.name,
    awayTeam: match.awayCompetitor.name,
    homeStanding: toStanding(standingsRows, match.homeCompetitor.name),
    awayStanding: toStanding(standingsRows, match.awayCompetitor.name),
    trends: trends?.trends ?? null,
    pregameStats: pregameData?.statistics ?? null,
  };
}

export async function getWorldCupStandingsRows(): Promise<readonly CompetitionTableRow[] | undefined> {
  const tableData = await getCompetitionTable(COMPETITION_IDS_MAP.WORLD_CUP).catch(() => undefined);
  return tableData?.competitionTable;
}

async function buildDossiersForMatches(matches: readonly MatchDetails[]): Promise<MatchDossier[]> {
  const standingsRows = await getWorldCupStandingsRows();
  return Promise.all(matches.map((match) => buildMatchDossier(match, standingsRows)));
}

export function buildPreviewPrompt(slateLabel: string, dossiers: MatchDossier[]): string {
  return `You are an expert football analyst. Below is COMPLETE pre-gathered data for every FIFA World Cup match in the upcoming match-day slate. All kickoff times are Asia/Jerusalem local time, so this slate spans tonight and the early hours of the next morning (the games are played in the Americas). All the data you need is already provided — do NOT call any tools. Base every stat and claim STRICTLY on the provided data; never invent numbers.

IMPORTANT — LANGUAGE: The data (team names, venue, and the "trends" text) may be in Hebrew. Translate EVERYTHING into natural English, including all team and player names (e.g. write "Switzerland", "Ivory Coast", not their Hebrew spelling). The final message must contain NO Hebrew characters at all.

DATA (one object per match):
${JSON.stringify(dossiers, null, 2)}

For EACH match, write a rich preview using ONLY the data above:
1. Header line: "🌍 <Home> vs <Away>" (English names), then a second line with the kickoff time (use the "kickoff" field, which is already Asia/Jerusalem local time), stage/round, and venue (and TV channel if present).
2. Group standings: if standings are provided for the teams, show each team's position, points, and games played, labelled clearly as their place in the World Cup standings table. NEVER call it a "FIFA ranking" and NEVER invent a FIFA/world ranking or any number not in the data. If no standings are provided (e.g. knockout stage), omit this line entirely.
3. Form & key data: summarize recent form (W/D/L), goals scored/conceded tendencies, notable streaks, and head-to-head history from the provided trends and pre-game statistics. Translate every Hebrew stat into English.
4. Betting odds: Display an odds line ONLY for outcomes whose numeric 1X2 odds are explicitly present in the pre-game statistics, formatted 🏠 Home | 🤝 Draw | 🚌 Away. NEVER write placeholder text such as "(not provided)", "N/A", or a dash for a missing odd — leave that outcome out. If no numeric odds are present at all, OMIT the odds line completely.
5. Analysis: one focused paragraph explaining the matchup and what will likely decide it, grounded in the data.
6. Prediction:
   - Win probabilities for the 90-minute result: 🏠 X% | 🤝 Y% | 🚌 Z%. These THREE numbers MUST add up to exactly 100 — verify the arithmetic before writing them.
   - Predicted 90-minute scoreline, e.g. "Predicted score: 2-1".
   - Confidence: Low / Medium / High.
   - KNOCKOUT RULE: If the stage is a knockout round (Round of 32, Round of 16, Quarter-final, Semi-final, Final — anything that is not a group stage), the tie MUST produce a winner. If your 90-minute prediction is a draw, add a line "Advances: <Team>" naming who you expect to progress via extra time or penalties. Never leave a knockout tie without a winner.

Formatting rules:
- Start the whole message with: "🌍 World Cup — Upcoming games & predictions (night of ${slateLabel})"
- Separate matches with a line containing only "---"
- Use Markdown. Keep it engaging but tight (~1 paragraph of analysis per match).
- English only — no Hebrew characters anywhere.
- Output ONLY the user-facing message. Do NOT include any meta-commentary, internal reasoning, or notes about your process.`;
}

export async function worldCupPreview(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const { matches } = await getCompetitionMatches(COMPETITION_IDS_MAP.WORLD_CUP);
    const slate = selectNightSlate(matches ?? [], new Date());

    if (!slate.length) {
      logger.log('No upcoming World Cup match-day slate within range — skipping preview');
      return;
    }

    const slateLabel = getDateString(new Date(slate[0].startTime));
    const dossiers = await buildDossiersForMatches(slate);

    const response = await chatbotService.processMessage(buildPreviewPrompt(slateLabel, dossiers), MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      logger.log(`Sent World Cup preview for ${dossiers.length} match(es) in slate ${slateLabel}`);
    }
  } catch (err) {
    logger.error(`Failed to send World Cup preview: ${err}`);
  }
}
