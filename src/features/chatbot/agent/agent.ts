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
  gamePriceWatcherTool,
  gameReleasesTool,
  githubTool,
  gmailTool,
  hotelWatcherTool,
  makavdiaTool,
  matchPredictionTool,
  matchSummaryTool,
  meetupsTool,
  polymarketTool,
  recipesTool,
  reminderTool,
  socialTool,
  spotifyPodcastTool,
  spotifyTool,
  topMatchesForPredictionTool,
  weatherTool,
  webSearchTool,
  woltTool,
  worldlyTool,
} from '@shared/ai';
import { AgentDescriptor } from '../types';

const AGENT_NAME = 'CHATBOT';
const AGENT_DESCRIPTION =
  'A helpful AI assistant chatbot with access to real-time web search, weather, earthquake monitoring, calendar, Gmail, smart reminders, football/sports information, exercise tracking, cooking recipes, GitHub repository automation, Wolt food delivery statistics, Worldly game statistics, Polymarket prediction markets, Spotify music search and playlist management, TikTok user posts and transcripts, X (Twitter) user latest posts, YouTube channel videos, public Telegram channel posts, a daily 22:45 digest of new posts from followed TikTok/Twitter/YouTube/Telegram accounts (chatty platforms summarized into key points, plus up to 5 of the newest new TikTok videos attached as playable Telegram videos), and a personal friends contact list for social suggestions';
const AGENT_PROMPT = `
You are a helpful AI assistant chatbot that can use external tools to answer user questions and help track fitness activities.

Context:
- You maintain conversation history per user across interactions; always consider it when responding.
- Messages may start with context like [Context: User ID: xxx, Time: xxx]. Use it to personalize responses.
- TIMEZONE: The user's timezone is ${DEFAULT_TIMEZONE}. Interpret and create all times in this timezone unless explicitly told otherwise.

Your role:
1. Interpret the user's intent and decide whether a tool is needed.
2. Use the most relevant tool(s) when they provide better, more accurate, or up-to-date information. Don't call tools when you can answer directly.
3. Answer clearly, concisely, and in a friendly tone. Reply in the same language the user wrote in; never translate the user's content unless asked.
4. If a tool fails or returns incomplete data, say so politely and give the best answer you can without it.

Each tool's description documents its actions, required call sequences, confirmations, defaults, and reply formatting. Follow those rules whenever you use a tool.

General style:
- Be concise but informative; keep responses to the point.
- Use markdown for lists, code, and structured data, and emojis where they enhance engagement.
- For anything that needs current, real-time, or post-training information (news, live prices, recent releases, facts you're unsure about), use web_search instead of guessing.
`;

export function agent(): AgentDescriptor {
  const tools = [
    weatherTool,
    webSearchTool,
    earthquakeTool,
    competitionMatchesTool,
    competitionTableTool,
    competitionsListTool,
    matchSummaryTool,
    topMatchesForPredictionTool,
    matchPredictionTool,
    makavdiaTool,
    calendarTool,
    gmailTool,
    reminderTool,
    exerciseTool,
    exerciseAnalyticsTool,
    recipesTool,
    woltTool,
    worldlyTool,
    polymarketTool,
    githubTool,
    contactsTool,
    meetupsTool,
    spotifyTool,
    spotifyPodcastTool,
    socialTool,
    hotelWatcherTool,
    gameReleasesTool,
    gamePriceWatcherTool,
  ];

  return {
    name: AGENT_NAME,
    prompt: AGENT_PROMPT,
    description: AGENT_DESCRIPTION,
    tools,
  };
}
