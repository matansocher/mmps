import type { EvalCase, ToolFixture } from './types';

// English golden cases mined from real chatbot conversations. Cases cover every registered
// tool, key actions, ID-dependent workflows, critical arguments, multi-turn follow-ups,
// confirmation behavior, and no-tool guards. Three explicit categories are represented:
// single-domain (one tool), cross-domain (a message that must span two or more tools), and
// ambiguous/underspecified (the agent should clarify instead of guessing a wrong tool).

function reminderFixture(id: string, message: string): ToolFixture {
  return (args) => {
    if (args.action === 'list') {
      return { reminders: [{ id, message, dueDate: '2026-07-16T18:00:00', status: 'pending' }] };
    }
    return { success: true, reminderId: args.reminderId, action: args.action };
  };
}

function gmailFixture(args: Record<string, unknown>): unknown {
  if (args.action === 'list') {
    return {
      message: 'Found 1 email',
      emails: [{ id: 'email-shani-1', from: 'Shani <shani@example.com>', subject: 'Standup', snippet: 'Tomorrow at 9' }],
    };
  }
  return { success: true, emailId: args.emailId, action: args.action };
}

function calendarFixture(args: Record<string, unknown>): unknown {
  if (args.action === 'list') {
    return {
      success: true,
      events: [{ id: 'event-union-1', summary: 'Union game', start: '2026-07-16T20:00:00' }],
    };
  }
  return { success: true, eventId: args.eventId, action: args.action };
}

export const dataset: readonly EvalCase[] = [
  // ---------- exercise logging ----------
  { id: 'exercise-01', category: 'exercise', input: 'I exercised', expect: { tool: 'exercise_tracker', action: 'log' } },
  { id: 'exercise-06', category: 'exercise', input: 'I walked 30 min today and went 20 floors up', expect: { tool: 'exercise_tracker', action: 'log' } },

  // ---------- exercise history / analytics ----------
  { id: 'exercise-hist-01', category: 'exercise-stats', input: 'how many times have i exercised this week?', expect: { tool: ['exercise_tracker', 'exercise_analytics'] } },

  // ---------- smart reminders ----------
  { id: 'reminder-list-01', category: 'reminders', input: 'What reminders do i have?', expect: { tool: 'smart_reminders', action: 'list' } },
  { id: 'reminder-time-01', category: 'reminders', input: 'Remind me to call Tali at 1800', expect: { tool: 'smart_reminders', action: 'create', args: { dueDate: /T18:00/ } } },
  {
    id: 'reminder-default-01',
    category: 'reminders',
    input: 'Remind me to order for teamLab Planets',
    expect: { tool: 'smart_reminders', action: 'create', args: { dueDate: /T18:00:00/ } },
    note: 'no time -> default 18:00',
  },
  {
    id: 'reminder-remove-01',
    category: 'reminders',
    input: 'i talked with agam, you can remove the reminder',
    expect: {
      tool: 'smart_reminders',
      sequence: [
        { tool: 'smart_reminders', action: 'list' },
        { tool: 'smart_reminders', action: ['delete', 'complete'], args: { reminderId: 'reminder-agam-1' } },
      ],
    },
    fixtures: { smart_reminders: reminderFixture('reminder-agam-1', 'Talk with Agam') },
  },
  {
    id: 'reminder-snooze-01',
    category: 'reminders',
    input: 'snooze my dentist reminder for 2 hours',
    expect: {
      tool: 'smart_reminders',
      sequence: [
        { tool: 'smart_reminders', action: 'list' },
        { tool: 'smart_reminders', action: 'snooze', args: { reminderId: 'reminder-dentist-1', snoozeMinutes: 120 } },
      ],
    },
    fixtures: { smart_reminders: reminderFixture('reminder-dentist-1', 'Dentist appointment') },
  },

  // ---------- gmail ----------
  { id: 'gmail-list-01', category: 'gmail', input: 'what unread email do i have?', expect: { tool: 'gmail', action: 'list' } },
  {
    id: 'gmail-delete-01',
    category: 'gmail',
    input: 'delete the email from shani',
    expect: {
      tool: 'gmail',
      sequence: [
        { tool: 'gmail', action: 'list', args: { query: /from:shani/i } },
        { tool: 'gmail', action: 'delete', args: { emailId: 'email-shani-1' } },
      ],
    },
    fixtures: { gmail: gmailFixture },
  },
  {
    id: 'gmail-send-01',
    category: 'gmail',
    input: 'Send an email to me with subject "Standup reminder" and body "Standup is at 9am".',
    expect: { tool: null, response: /(confirm|go ahead|should i|shall i|send it)/i },
    note: 'sending requires explicit confirmation before the gmail tool is called',
  },

  // ---------- github ----------
  { id: 'github-list-issues', category: 'github', input: 'what open issues do we have?', expect: { tool: 'github', action: 'list_issues' } },
  {
    id: 'github-review-label',
    category: 'github',
    input: 'can you review this PR #371?',
    expect: { tool: 'github', action: 'add_labels', args: { labels: /review/ } },
    note: 'review -> add review label',
  },
  { id: 'github-implement-01', category: 'github', input: 'implement issue #42', expect: { tool: 'github', action: 'add_labels', args: { labels: /implement/ } }, note: 'implement existing issue' },
  {
    id: 'github-create-issue',
    category: 'github',
    input: 'create a github issue titled "daily summary scheduler update" about changing its run time',
    expect: { tool: 'github', action: 'create_issue' },
  },

  // ---------- polymarket ----------
  { id: 'poly-sub-url', category: 'polymarket', input: 'subscribe me to this market https://polymarket.com/event/us-strikes-iran-by', expect: { tool: 'polymarket', action: 'subscribe' } },
  { id: 'poly-list-01', category: 'polymarket', input: 'show me all my subscriptions', expect: { tool: 'polymarket', action: 'list' } },
  { id: 'poly-unsub', category: 'polymarket', input: 'unsubscribe me from the world cup winner market', expect: { tool: 'polymarket', action: 'unsubscribe' } },

  // ---------- calendar ----------
  { id: 'cal-create-01', category: 'calendar', input: 'Create a Google Calendar event for today at 6 PM to call Yotam', expect: { tool: 'calendar', action: 'create' } },
  { id: 'cal-list-01', category: 'calendar', input: "what's my schedule for tomorrow?", expect: { tool: 'calendar', action: ['list', 'upcoming'] } },
  {
    id: 'cal-delete-01',
    category: 'calendar',
    input: 'delete the Union game from my calendar',
    expect: {
      tool: 'calendar',
      sequence: [
        { tool: 'calendar', action: 'list', args: { searchQuery: /Union/i } },
        { tool: 'calendar', action: 'delete', args: { eventId: 'event-union-1' } },
      ],
    },
    fixtures: { calendar: calendarFixture },
  },

  // ---------- weather ----------
  { id: 'weather-current-01', category: 'weather', input: "what's the weather in Tel Aviv?", expect: { tool: 'weather', action: 'current' } },
  { id: 'weather-forecast-01', category: 'weather', input: "what's the forecast for December 25 in London?", expect: { tool: 'weather', action: 'forecast', args: { date: /-12-25/ } } },
  { id: 'weather-hourly-01', category: 'weather', input: "give me tomorrow's hourly forecast for Kfar Saba", expect: { tool: 'weather', action: 'tomorrow_hourly' } },

  // ---------- sports (routed through the single `sports` sub-agent tool) ----------
  {
    id: 'sports-table-01',
    category: 'sports',
    input: 'show me the table of the premier league',
    expect: { tool: 'sports' },
  },
  { id: 'sports-matches-02', category: 'sports', input: 'what football matches are on today?', expect: { tool: 'sports' } },
  { id: 'sports-comps-01', category: 'sports', input: 'which competitions can you show me?', expect: { tool: 'sports' } },
  { id: 'sports-predict-01', category: 'sports', input: 'predict the top upcoming football matches', expect: { tool: 'sports' } },
  { id: 'sports-result-01', category: 'sports', input: "what's the result of the Real Madrid match?", expect: { tool: 'sports' } },

  // ---------- spotify ----------
  { id: 'spotify-playlists-01', category: 'spotify', input: 'what are my playlists in spotify?', expect: { tool: 'spotify', action: 'get_user_playlists' } },
  { id: 'spotify-create-01', category: 'spotify', input: 'create a spotify playlist called Road Trip', expect: { tool: 'spotify', action: 'create_playlist' } },

  // ---------- contacts / meetups ----------
  { id: 'contacts-01', category: 'contacts', input: 'Who should I call?', expect: { tool: ['contacts', 'meetups'], action: 'suggest' } },

  // ---------- recipes ----------
  { id: 'recipes-list-01', category: 'recipes', input: 'What recipes do you know I use?', expect: { tool: 'recipes', action: 'list_recipes' } },

  // ---------- wolt / worldly stats ----------
  { id: 'wolt-01', category: 'bot-stats', input: 'what are the usages of the wolt bot in the last 10 days?', expect: { tool: 'wolt_summary' } },
  { id: 'worldly-01', category: 'bot-stats', input: 'show me the worldly game stats for this week', expect: { tool: 'worldly_summary' } },

  // ---------- makavdia (Deni Avdija) ----------
  { id: 'makavdia-01', category: 'makavdia', input: 'how did Deni Avdija play last night?', expect: { tool: 'makavdia' } },

  // ---------- earthquake ----------
  { id: 'quake-01', category: 'earthquake', input: 'any recent earthquakes?', expect: { tool: 'earthquake_monitor' } },

  // ---------- spotify podcast ----------
  { id: 'podcast-sub-01', category: 'podcast', input: 'notify me when the Lex Fridman podcast posts a new episode', expect: { tool: 'spotify_podcast', action: ['search', 'subscribe'] } },

  // ---------- no tool (general conversation / knowledge) ----------
  { id: 'notool-03', category: 'no-tool', input: 'hi', expect: { tool: null } },
  { id: 'notool-05', category: 'no-tool', input: 'what is the capital of France?', expect: { tool: null }, note: 'general knowledge' },
  { id: 'notool-reminder-thought', category: 'no-tool', input: 'I should probably call my mom sometime', expect: { tool: null }, note: 'do not create reminders from a passing thought' },
  { id: 'notool-email-draft', category: 'no-tool', input: 'Help me write a polite email declining an invitation', expect: { tool: null }, note: 'drafting text should not send email' },
  { id: 'notool-weather-knowledge', category: 'no-tool', input: 'Why does rain happen?', expect: { tool: null }, note: 'general knowledge does not require live weather' },
  { id: 'notool-calendar-knowledge', category: 'no-tool', input: 'What is the Gregorian calendar?', expect: { tool: null }, note: 'general knowledge does not require calendar access' },

  // ---------- multi-turn reference resolution ----------
  {
    id: 'reminder-multiturn-snooze',
    category: 'reminders',
    input: ['Show me my reminders', 'Snooze the dentist one for two hours'],
    expect: {
      tool: 'smart_reminders',
      sequence: [
        { tool: 'smart_reminders', action: 'list' },
        { tool: 'smart_reminders', action: 'snooze', args: { reminderId: 'reminder-dentist-1', snoozeMinutes: 120 } },
      ],
    },
    fixtures: { smart_reminders: reminderFixture('reminder-dentist-1', 'Dentist appointment') },
  },
  {
    id: 'gmail-multiturn-delete',
    category: 'gmail',
    input: ['Show me emails from Shani', 'Delete the first one'],
    expect: {
      tool: 'gmail',
      sequence: [
        { tool: 'gmail', action: 'list', args: { query: /from:shani/i } },
        { tool: 'gmail', action: 'delete', args: { emailId: 'email-shani-1' } },
      ],
    },
    fixtures: { gmail: gmailFixture },
  },

  // ---------- cross-domain (a single request that must span two or more tools) ----------
  {
    id: 'cross-sports-calendar-01',
    category: 'cross-domain',
    input: 'add the next Real Madrid match to my calendar',
    expect: {
      tool: 'calendar',
      sequence: [{ tool: 'sports' }, { tool: 'calendar', action: 'create' }],
    },
    fixtures: {
      sports: '**Upcoming matches**\nReal Madrid vs Barcelona — 2026-07-20 22:00',
    },
    note: 'sports lookup -> calendar create',
  },
  {
    id: 'cross-weather-calendar-01',
    category: 'cross-domain',
    input: 'if it will be sunny in Tel Aviv on December 25, add a beach day event to my calendar that morning',
    expect: {
      tool: 'calendar',
      sequence: [
        { tool: 'weather', action: 'forecast', args: { date: /-12-25/ } },
        { tool: 'calendar', action: 'create' },
      ],
    },
    fixtures: { weather: 'Tel Aviv on 2026-12-25: Sunny, 24°C, clear skies.', calendar: calendarFixture },
    note: 'weather forecast -> conditional calendar create',
  },
  {
    id: 'cross-gmail-reminder-01',
    category: 'cross-domain',
    input: "check my unread email from Shani and set a reminder to reply tomorrow at 9am",
    expect: {
      tool: ['gmail', 'smart_reminders'],
      sequence: [
        { tool: 'gmail', action: 'list' },
        { tool: 'smart_reminders', action: 'create', args: { dueDate: /T09:00/ } },
      ],
    },
    fixtures: { gmail: gmailFixture },
    note: 'email lookup -> reminder create',
  },
  {
    id: 'cross-weather-reminder-01',
    category: 'cross-domain',
    input: "what's the weather in Kfar Saba tomorrow, and remind me to take an umbrella at 8am if it rains",
    expect: {
      tool: ['weather', 'smart_reminders'],
      sequence: [
        { tool: 'weather' },
        { tool: 'smart_reminders', action: 'create', args: { dueDate: /T08:00/ } },
      ],
    },
    fixtures: { weather: 'Kfar Saba tomorrow: Rain likely, 60% chance, 18°C.' },
    note: 'weather lookup -> conditional reminder create',
  },
  {
    id: 'cross-calendar-contacts-01',
    category: 'cross-domain',
    input: 'am i free tomorrow evening, and if so who should i call?',
    expect: {
      tool: ['calendar', 'contacts', 'meetups'],
      sequence: [{ tool: 'calendar', action: ['list', 'upcoming'] }, { tool: ['contacts', 'meetups'], action: 'suggest' }],
    },
    fixtures: { calendar: calendarFixture },
    note: 'availability check -> contact suggestion',
  },
  {
    id: 'cross-sports-predict-02',
    category: 'cross-domain',
    input: "give me a prediction for this weekend's biggest football match",
    expect: { tool: 'sports' },
    fixtures: {
      sports: '**Arsenal vs Chelsea**\nOdds: Arsenal 45%, Draw 28%, Chelsea 27%.',
    },
    note: 'find top match -> fetch its prediction data (handled inside the sports sub-agent)',
  },

  // ---------- ambiguous / underspecified (should clarify, not guess a wrong tool) ----------
  {
    id: 'ambiguous-remind-notime',
    category: 'ambiguous',
    input: 'can you remind me?',
    expect: { tool: null, response: /(remind you (of|about) what|what.*remind|when|what would you like)/i },
    note: 'no subject or time -> ask for clarification, do not create a reminder',
  },
  {
    id: 'ambiguous-book-it',
    category: 'ambiguous',
    input: 'book it for me',
    expect: { tool: null, response: /(book what|what.*book|which|more (detail|info)|clarif|not sure)/i },
    note: 'no referent -> clarify what to book',
  },
  {
    id: 'ambiguous-whats-happening',
    category: 'ambiguous',
    input: "what's happening?",
    expect: { tool: null, response: /(with what|which|what.*mean|be more specific|regarding|not sure|clarif)/i },
    note: 'vague small talk -> should not fire a tool blindly',
  },
  {
    id: 'ambiguous-send-it',
    category: 'ambiguous',
    input: 'send it',
    expect: { tool: null, response: /(send what|what.*send|to whom|which|more (detail|info)|clarif)/i },
    note: 'no referent and sending needs confirmation anyway',
  },
  {
    id: 'ambiguous-the-game',
    category: 'ambiguous',
    input: 'what about the game?',
    expect: { tool: null, response: /(which game|what game|which (team|match)|be more specific|clarif)/i },
    note: 'no team/competition specified -> clarify before calling a sports tool',
  },
  {
    id: 'ambiguous-schedule-something',
    category: 'ambiguous',
    input: 'schedule something for later',
    expect: { tool: null, response: /(schedule what|what.*schedule|when|what time|which|more (detail|info)|clarif)/i },
    note: 'no event details -> clarify before creating a calendar event',
  },
];
