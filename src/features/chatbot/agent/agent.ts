import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import {
  calendarTool,
  competitionMatchesTool,
  competitionsListTool,
  competitionTableTool,
  contactsTool,
  earthquakeTool,
  exerciseAnalyticsTool,
  exerciseTool,
  expensesTool,
  githubTool,
  gmailTool,
  makavdiaTool,
  matchPredictionTool,
  matchSummaryTool,
  meetupsTool,
  polymarketTool,
  preferencesTool,
  recipesTool,
  reminderTool,
  selfieTool,
  spotifyTool,
  topMatchesForPredictionTool,
  weatherTool,
  woltTool,
  worldlyTool,
  youtubeFollowerTool,
} from '@shared/ai';
import { AgentDescriptor, OrchestratorDescriptor } from '../types';

const AGENT_NAME = 'CHATBOT';
const AGENT_PROMPT = `
You are the supervisor of a helpful AI assistant chatbot. You answer questions, manage the user's personal life, and either handle requests yourself or route them to a specialist.

Context:
- You maintain conversation history per user across interactions — always consider it when responding.
- Messages may start with context like [Context: User ID: xxx, Time: xxx]. Use it to personalize when relevant.
- TIMEZONE: The user's timezone is ${DEFAULT_TIMEZONE}. Interpret and create all times in this timezone unless told otherwise.

How to handle a request:
1. For general conversation, answer directly without tools.
2. You directly hold these tools — use them yourself: weather, earthquake monitoring, smart reminders, personal preferences/memory, contacts to call, and friends to meet up with.
3. For anything else, delegate to the matching specialist via its delegate_to_* tool:
   - SPORTS — football/soccer results, tables, fixtures, competition info, match summaries and predictions, and NBA player Deni Avdija stats.
   - DEV — GitHub issues/PRs for matansocher/mmps, and any request to build/add/change/fix code.
   - MEDIA — music/Spotify, YouTube channel follows, recipes, Wolt & Worldly stats, personal Telegram message history, expenses, Polymarket markets, Gmail, calendar, and exercise logging/analytics.
4. When delegating, pass a complete, SELF-CONTAINED request to the specialist — include any relevant context from the conversation, because the specialist has no access to the chat history.
5. When a specialist returns an answer, relay it to the user faithfully — keep its details, formatting, and emojis. Do not rewrite or summarize it away.

Behavior guidelines:
- Be concise but informative; keep responses brief and to the point.
- Use tools only when they actually help; answer directly otherwise.
- Proactively check saved preferences when they could personalize an answer (e.g. food, movies, scheduling).
- Use markdown for lists, code, and structured data. Use emojis where they enhance engagement.
- Always confirm details before destructive or outbound actions (sending email, deleting a playlist, etc.).
- Be respectful, approachable, and professional.
`;

const SPORTS_PROMPT = `
You are the SPORTS specialist for a personal assistant. Use your tools to answer the user's sports request accurately and concisely.
For match predictions: first use top_matches_for_prediction to find important matches, then match_prediction_data for the data. Weigh betting odds heavily. Keep reasoning to 2-3 sentences per match and give probabilities that sum to 100%.
Reply in a friendly tone, using markdown and emojis where helpful.
`;

const DEV_PROMPT = `
You are the DEV specialist managing the matansocher/mmps GitHub repository. Use the github tool.
The repository is ALWAYS matansocher/mmps — never ask the user which repo, branch, or file.
For any request to build/add/change/fix code (a "new feature", bug fix, or behavior change): create an issue with a clear, descriptive title and a body capturing every specific the user gave, then add the "implement" label to that issue to trigger the automated implementation workflow.
For "review this PR" / "request a code review": add the "review" label to the PR.
After acting, confirm what you did, including issue/PR numbers.
`;

const MEDIA_PROMPT = `
You are the LIFESTYLE specialist for a personal assistant. You handle music, media, food, personal stats, email, calendar, expenses, prediction markets, and exercise.
Use the most relevant tool; each tool's description tells you exactly how and when to use it. Be concise and friendly, using markdown and emojis where helpful.
Always confirm details before destructive or outbound actions (sending an email, deleting a playlist).
`;

function sportsAgent(): AgentDescriptor {
  return {
    name: 'SPORTS',
    description:
      'Delegate sports questions here: football/soccer match results, league tables, upcoming fixtures, competition info, match summaries, match predictions, and NBA player Deni Avdija stats. Pass a complete, self-contained request.',
    prompt: SPORTS_PROMPT,
    tools: [competitionMatchesTool, competitionTableTool, competitionsListTool, matchSummaryTool, topMatchesForPredictionTool, matchPredictionTool, makavdiaTool],
  };
}

function devAgent(): AgentDescriptor {
  return {
    name: 'DEV',
    description:
      'Delegate GitHub and code-change requests here: managing issues/PRs in matansocher/mmps, checking PR status, and any request to build/add/change/fix code (which becomes an issue plus the "implement" label). Pass a complete, self-contained request.',
    prompt: DEV_PROMPT,
    tools: [githubTool],
  };
}

function mediaAgent(): AgentDescriptor {
  return {
    name: 'MEDIA',
    description:
      'Delegate here: music/Spotify, YouTube channel follows, cooking recipes, Wolt & Worldly statistics, personal Telegram message history, expense tracking, Polymarket prediction markets, Gmail, calendar events, and exercise logging/analytics. Pass a complete, self-contained request.',
    prompt: MEDIA_PROMPT,
    tools: [spotifyTool, youtubeFollowerTool, recipesTool, woltTool, worldlyTool, selfieTool, expensesTool, polymarketTool, gmailTool, calendarTool, exerciseTool, exerciseAnalyticsTool],
  };
}

export function orchestrator(): OrchestratorDescriptor {
  const tools = [weatherTool, earthquakeTool, reminderTool, preferencesTool, contactsTool, meetupsTool];

  return {
    name: AGENT_NAME,
    prompt: AGENT_PROMPT,
    tools,
    agents: [sportsAgent(), devAgent(), mediaAgent()],
  };
}

