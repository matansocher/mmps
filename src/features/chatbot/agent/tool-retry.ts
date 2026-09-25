import { ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/messages/tool';
import { isGraphBubbleUp } from '@langchain/langgraph';
import { createMiddleware, ToolInvocationError } from 'langchain';
import { sleep } from '@core/utils';

// Tool calls that are safe to run twice. Everything else (send email, create issue, merge PR,
// add a reminder, ...) is never retried, and new tools are not retried until listed here.
// `true` = every action of the tool is read-only; an array = only those `action` values are.
const READ_ONLY_TOOL_ACTIONS: Readonly<Record<string, true | readonly string[]>> = {
  weather: true,
  web_search: true,
  earthquake_monitor: true,
  recipes: true,
  competitions_list: true,
  competition_matches: true,
  competition_table: true,
  match_summary: true,
  match_prediction_data: true,
  top_matches_for_prediction: true,
  makavdia: true,
  wolt_summary: true,
  worldly_summary: true,
  calendar: ['list', 'upcoming'],
  gmail: ['list'],
  github: ['get_issue', 'list_issues', 'list_prs', 'get_pr', 'get_pr_checks', 'list_pr_files', 'get_pr_reviews'],
  spotify: ['search_track', 'search_artist', 'get_track_info', 'search_playlist', 'get_artist_top_tracks', 'get_user_playlists'],
  spotify_podcast: ['search', 'list'],
  polymarket: ['list', 'trending', 'search', 'event'],
  social: ['latest_posts', 'user_info', 'video_transcript', 'list'],
  smart_reminders: ['list'],
  exercise_tracker: ['check_today', 'get_history', 'get_streaks'],
  exercise_analytics: ['weekly_summary', 'achievements', 'generate_reminder', 'check_record'],
  contacts: ['list', 'suggest'],
  meetups: ['list', 'suggest'],
  game_price_watcher: ['list'],
  game_releases: ['list', 'search'],
  hotel_watcher: ['list'],
};

const TRANSIENT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EAI_AGAIN',
  'EPIPE',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const MAX_DELAY_MS = 4000;

export type ToolRetryOptions = {
  readonly maxRetries?: number;
  readonly initialDelayMs?: number;
};

export function isReadOnlyToolCall(toolCall: Pick<ToolCall, 'name' | 'args'>): boolean {
  const rule = READ_ONLY_TOOL_ACTIONS[toolCall.name];
  if (rule === true) {
    return true;
  }
  const action = toolCall.args?.action;
  return Array.isArray(rule) && typeof action === 'string' && rule.includes(action);
}

function getHttpStatus(error: Record<string, unknown>): number | undefined {
  const response = error.response as Record<string, unknown> | undefined;
  return [error.status, error.statusCode, response?.status, error.code].find((value): value is number => typeof value === 'number');
}

// Timeouts, dropped connections, 408/425/429 and 5xx: failures that often succeed on a second try.
export function isTransientToolError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === 'AbortError') {
    return false;
  }
  if (error.name === 'TimeoutError') {
    return true;
  }
  const fields = error as unknown as Record<string, unknown>;
  const status = getHttpStatus(fields);
  if (status !== undefined) {
    return status === 408 || status === 425 || status === 429 || (status >= 500 && status !== 501);
  }
  if (typeof fields.code === 'string' && TRANSIENT_ERROR_CODES.has(fields.code)) {
    return true;
  }
  // Node's fetch throws a generic "fetch failed" TypeError with the socket error on `cause`.
  return error.cause !== undefined && error.cause !== error && isTransientToolError(error.cause);
}

function formatToolError(toolName: string, error: unknown, readOnly: boolean, attempts: number): string {
  if (!isTransientToolError(error)) {
    // Same text LangChain's ToolNode returns by default, so non-transient failures behave as before.
    return `${error}\n Please fix your mistakes.`;
  }
  if (readOnly) {
    return `${error}\nThe ${toolName} service is temporarily unavailable (failed ${attempts} times). Do not call it again this turn. Tell the user it is temporarily unavailable and to try again later.`;
  }
  return `${error}\nThe ${toolName} call failed with a temporary error, so it is unknown whether it went through. Do not repeat it. Tell the user it may or may not have completed and suggest they check.`;
}

// Retries read-only tool calls on transient errors, with exponential backoff. Also turns every
// tool exception into an error ToolMessage the model can act on: once any middleware wraps tool
// calls, LangChain re-raises tool exceptions instead of feeding them back, which would fail the
// whole turn.
export function createToolRetryMiddleware({ maxRetries = 2, initialDelayMs = 500 }: ToolRetryOptions = {}) {
  return createMiddleware({
    name: 'ToolRetryMiddleware',
    wrapToolCall: async (request, handler) => {
      const { name, id } = request.toolCall;
      const readOnly = isReadOnlyToolCall(request.toolCall);
      for (let attempt = 1; ; attempt++) {
        try {
          return await handler(request);
        } catch (err) {
          // Interrupts and schema errors are handled by LangChain's ToolNode as usual.
          if (isGraphBubbleUp(err) || ToolInvocationError.isInstance(err)) {
            throw err;
          }
          if (!readOnly || !isTransientToolError(err) || attempt > maxRetries) {
            return new ToolMessage({ content: formatToolError(name, err, readOnly, attempt), tool_call_id: id ?? '', name, status: 'error' });
          }
          await sleep(Math.min(initialDelayMs * 2 ** (attempt - 1), MAX_DELAY_MS));
        }
      }
    },
  });
}
