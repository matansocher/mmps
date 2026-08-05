import type { EvalCase, ToolFixture } from './types';

// English golden cases mined from real chatbot conversations. Cases cover every registered
// tool, key actions, ID-dependent workflows, critical arguments, multi-turn follow-ups,
// confirmation behavior, and no-tool guards.

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

const sportsFixtures: Readonly<Record<string, ToolFixture>> = {
  competitions_list: '**Available Football Competitions**\nPremier League (ID: 7) 📊',
  competition_table: '**Premier League - League Table**\n1. Arsenal - 82 points',
};

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

  // ---------- sports ----------
  {
    id: 'sports-table-01',
    category: 'sports',
    input: 'show me the table of the premier league',
    expect: {
      tool: 'competition_table',
      sequence: [{ tool: 'competitions_list' }, { tool: 'competition_table', args: { competitionId: 7 } }],
    },
    fixtures: sportsFixtures,
  },
  { id: 'sports-matches-02', category: 'sports', input: 'what football matches are on today?', expect: { tool: 'competition_matches' } },
  { id: 'sports-comps-01', category: 'sports', input: 'which competitions can you show me?', expect: { tool: 'competitions_list' } },
  { id: 'sports-predict-01', category: 'sports', input: 'predict the top upcoming football matches', expect: { tool: ['top_matches_for_prediction', 'match_prediction_data'] } },
  { id: 'sports-result-01', category: 'sports', input: "what's the result of the Real Madrid match?", expect: { tool: ['match_summary', 'competition_matches'] } },

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
];
