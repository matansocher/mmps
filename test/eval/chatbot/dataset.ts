import type { EvalCase } from './types';

// 40 single-turn, English golden cases mined from real chatbot conversations.
// Trimmed from an original 100 to the highest-signal set: every registered tool and its
// key actions are covered at least once, plus the trickiest arg cases (reminder default/
// explicit time, weather forecast date, github review/implement labels) and no-tool guards.
// Each is tagged by category for per-domain reporting. `expect.tool` is the tool the
// system prompt should route to; `action`/`args` are checked only where they matter.
//
// Registered chatbot tools (23): weather, earthquake_monitor, competition_matches,
// competition_table, competitions_list, match_summary, top_matches_for_prediction,
// match_prediction_data, makavdia, calendar, gmail, smart_reminders, exercise_tracker,
// exercise_analytics, recipes, wolt_summary, worldly_summary, polymarket, github,
// contacts, meetups, spotify, spotify_podcast.

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
  { id: 'reminder-remove-01', category: 'reminders', input: 'i talked with agam, you can remove the reminder', expect: { tool: 'smart_reminders', action: ['delete', 'complete'] } },
  { id: 'reminder-snooze-01', category: 'reminders', input: 'snooze my dentist reminder for 2 hours', expect: { tool: 'smart_reminders', action: 'snooze' } },

  // ---------- gmail ----------
  { id: 'gmail-list-01', category: 'gmail', input: 'what unread email do i have?', expect: { tool: 'gmail', action: 'list' } },
  { id: 'gmail-delete-01', category: 'gmail', input: 'delete the email from shani', expect: { tool: 'gmail', action: 'delete' } },
  { id: 'gmail-send-01', category: 'gmail', input: 'send an email to me reminding about the standup at 9am', expect: { tool: 'gmail', action: 'send' } },

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
  { id: 'cal-delete-01', category: 'calendar', input: 'delete the Union game from my calendar', expect: { tool: 'calendar', action: 'delete' } },

  // ---------- weather ----------
  { id: 'weather-current-01', category: 'weather', input: "what's the weather in Tel Aviv?", expect: { tool: 'weather', action: 'current' } },
  { id: 'weather-forecast-01', category: 'weather', input: "what's the forecast for December 25 in London?", expect: { tool: 'weather', action: 'forecast', args: { date: /-12-25/ } } },
  { id: 'weather-hourly-01', category: 'weather', input: "give me tomorrow's hourly forecast for Kfar Saba", expect: { tool: 'weather', action: 'tomorrow_hourly' } },

  // ---------- sports ----------
  { id: 'sports-table-01', category: 'sports', input: 'show me the table of the premier league', expect: { tool: 'competition_table' } },
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
];
