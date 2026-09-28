# Mindloop

Mindloop is a React mini-app with 14 original games across five categories. Express serves it at `/mindloop/*`; MongoDB stores verified Telegram players’ progress. A normal browser visit also works, with progress saved on that device.

## Player experience

- A single playable welcome replaces the old tour. Completing its warm-up earns one round of credit, once per device.
- Home offers a three-round daily loop, a shared daily escape puzzle, favorites, search, and category filters. Early recommendations start with Grid Recall, Odd One Out, and Quick Math. Players can request fewer recommendations of a game and restore them in Settings.
- Every completed round counts toward the daily goal, including repeats and practice. One completed round maintains the daily streak. The weekly target is three days of play; missing a day never removes an earned reward.
- Each unfamiliar game has a short interactive example. Previously played games start directly. The shared game header provides Help, Pause, and Exit; active navigation requires confirmation.
- Pausing or backgrounding freezes timers, reveals, and movement. The board becomes hidden and inert while paused. Active classic timers use elapsed time, including rendering delays. Practice runs use a gentler clock and separate records.
- Results show game metrics, a comparable recent average, a record for that mode and board, new keepsakes, and the next round. Finishing the loop provides a stopping point and a summary.
- Progress includes lifetime totals, current and longest streaks, recent score charts, permanent keepsakes, and game-specific milestones. An earned keepsake can be carried on Home.
- Settings include light/dark/system appearance, sound, haptics, reduced motion, shape spotting, math practice level, reminders, usage analytics, and a local-data reset.

### Games and practice

| Game | Classic play | Improvements / practice |
| --- | --- | --- |
| Grid Recall | Repeat growing tile patterns until a mistake | Counts remembered tiles and largest completed pattern; practice allows two corrections and ends after five patterns. |
| Pair Match | Clear growing boards in 60 seconds | Matching efficiency and clear celebrations; board transitions receive their time back. Practice is one untimed board. |
| Sequence Echo | Repeat an expanding sequence | Each pad has a tone. Errors replay the expected sequence. Practice offers retries and a six-pad target. |
| Sequence Track | Follow moving targets | Clear watch/move/select phases; practice begins with one target. |
| Odd One Out | Spot a different shade in 45 seconds | More consistent shade range, optional shape outlines, separate shade/shape records, one mistake penalty. |
| Flash Match | Compare shape and color for 45 seconds | Match and nonmatch examples; errors explain which feature changed. |
| Quick Math | Solve increasingly difficult problems in 45 seconds | Mistakes reset the streak without removing extra time; choose a practice starting level. |
| Raindrops | Clear falling equations in 60 seconds or before three misses | Compact keypad, lowest-drop prompt, answer accuracy, slower drops in practice. |
| Color Clash | Choose ink colors for 40 seconds | Ink-versus-word example and a single mistake penalty. |
| Rail Router | Route trains on a selected railway for 90 seconds | Interactive junction lesson, remembered railway, per-board records, accuracy and mastery marks. |
| Ebb & Flow | Switch between arrow direction and movement for 45 seconds | Separate rule examples, explicit rule labels, compact controls, one mistake penalty. |
| Block Escape | Free blocks on successive boards in 60 seconds | Practice and daily mode use one untimed puzzle, an optimal-move target, and optional hints after inactivity. |
| Order Up | Remember and serve six waves of orders | Ingredient art during memorization, compact serving controls, customer feedback and expected orders after mistakes. Practice waits for the player to hide orders. |
| Shape Shift | Match rotated shapes in 60 seconds | Four options fit in one row. On a mistake, the target turns toward the correct option; the correction display time is credited. |

Scores describe performance in each game. Records are keyed by game, mode, scoring version, and variant; scores from unrelated games are never combined into a cognitive score.

## Daily challenge

Block Escape selects a deterministic puzzle using `escape-v2-YYYY-MM-DD`. The challenge date is UTC and appears in the game header. Sharing opens the native share sheet or copies a link containing the date. It never sends a Telegram message automatically. Replays use the same board; assisted solves keep a separate `-guided` record. Personal records are shown, with no public leaderboard or claim of a first-attempt competition.

The daily loop, streak, and weekly goal use the device’s local calendar day. Daily challenge dates use UTC so friends receive the same puzzle.

## Saving and migration

`src/shared/mindloop/progress.ts` is shared by client and server. Progress has independent counters per device, permanent award timestamps, and comparable score records. Merging takes the maximum for each device counter and record, and the earliest award timestamp. Repeating a snapshot does not double-count it. Lifetime progress is independent of recent-history caps (200 entries locally, 500 on the server).

The client saves a complete snapshot and serializes requests. It reconciles responses against current local state, preserving rounds completed during an in-flight request. A durable dirty marker schedules another save when necessary. Failed requests retry with bounded exponential delay, and startup, focus, and network recovery trigger reconciliation. Favorite replacements use timestamps so removal does not become an accidental union.

Legacy history is migrated once into a legacy counter source. Earlier best scores and earned 500/1000-point awards are retained. The new scoring system starts separate records. Counts already lost to the old history cap cannot be reconstructed from absent records.

The UI distinguishes device-only, syncing, saved, pending, and unavailable local storage. An in-memory fallback keeps the current visit playable if storage fails. “Clear this device” does not delete a Telegram profile; synchronized data can return on the next sync.

## Telegram setup

The page loads the official Telegram Web App SDK. Initialization supplies safe-area spacing, follows Telegram’s theme when appearance is set to system, handles Back and closing confirmation, and uses optional haptics and home-screen installation where supported. Identity still comes exclusively from server verification of signed `initData`.

A plain URL opened from a Telegram message is not necessarily a signed Mini App launch. Configure the bot’s Mini App/menu button to open the public HTTPS `/mindloop/` URL. Verify that `initData` is present through that launch path; do not infer authentication from Telegram’s browser appearance.

```bash
MONGO_DB_URL=mongodb://localhost:27017
MINDLOOP_TELEGRAM_BOT_TOKEN=...
# Public HTTPS mini-app URL. Required to enable reminder opt-in.
MINDLOOP_APP_URL=https://your-host.example/mindloop/
```

Mindloop initializes independently of `LOCAL_ACTIVE_BOT_ID`. The token verifies identity and sends explicitly enabled reminders through an API-only Telegram client; it does not create another polling bot. Local API testing supports `X-Mindloop-Dev-User`; the frontend can set it with `?devUser=123` outside production.

### Optional reminders

Players choose a local time and IANA time zone and grant Telegram write access. Settings always provides an off switch. The server scans once per minute in production only when both token and HTTPS app URL are configured. It skips completed loops, claims each player/date before sending, and does not retry ambiguous send failures that day. A five-minute catch-up window avoids late reminders after an outage. Claims prevent duplicates across processes or repeated daylight-saving hours. Telegram 403 responses disable that subscription.

No reminders are sent by the development preview or unit tests.

## API and storage

All `/api/mindloop/player*` routes require verified Telegram or local-development identity.

| Route | Purpose |
| --- | --- |
| `GET /api/mindloop/player` | Retrieve the player snapshot. |
| `POST /api/mindloop/player/sync` | Reconcile history, permanent progress, records, and favorites. |
| `POST /api/mindloop/player/result` | Compatibility endpoint for individual results. |
| `PUT /api/mindloop/player/favorites` | Compatibility endpoint for favorite replacement. |
| `GET /api/mindloop/player/reminder` | Reminder availability and current preference. |
| `PUT /api/mindloop/player/reminder` | Enable, update, or disable a reminder. |
| `POST /api/mindloop/player/events` | Collect authenticated, pseudonymous usage events. |
| `POST /api/mindloop/events` | Collect device-identified browser events. |

MongoDB database `Mindloop` contains `Players`, `Reminders`, and `Events`. Player updates retain revision-guarded compare-and-swap merges. Events deduplicate on event ID, validate an allowlist of properties, impose batch and rate limits, and expire after 90 days. Authenticated analytics use an HMAC of the verified user ID; raw Telegram authentication data and messages are not stored in events. Browser identity stays device-specific. Analytics can be disabled in Settings.

## Retention measurement

Events cover opens, onboarding, first game start, starts, first inputs, completions, explicit abandons, replays, next rounds, goal completion, sync failure, reminder choices, reminder opens, and challenge sharing. Properties include game/mode, duration when applicable, scoring version, launch context, source, returning status, and viewport. The offline event queue is bounded; it is diagnostic, not an audit log. Forced process termination can omit abandonment events, so also measure starts without completions.

Compare cohorts by their first observed `app_open` date and launch context. Keep authenticated Telegram users separate from browser devices. For each sufficiently mature cohort, report:

- First-input and first-game completion rates.
- Fraction completing a second round in the opening session.
- D1 and D7 return rates, using the same timezone and exact calendar-day definition throughout.
- Three-round completion, replay, and next-round rates.
- Abandonment and completion by game, mode, viewport, and first/returning visit.
- Sync failure/recovery and reminder opt-out rates.

Example read-only `mongosh` aggregation for daily completion activity:

```javascript
db.getSiblingDB('Mindloop').Events.aggregate([
  { $match: { name: 'game_completed', at: { $gte: ISODate('2026-09-28T00:00:00Z') } } },
  { $group: {
    _id: { day: { $dateToString: { date: '$at', format: '%Y-%m-%d', timezone: 'UTC' } }, game: '$properties.gameId', launch: '$properties.launch' },
    rounds: { $sum: 1 }, players: { $addToSet: '$player' }
  } },
  { $project: { rounds: 1, players: { $size: '$players' } } },
  { $sort: { '_id.day': 1, '_id.game': 1 } }
]);
```

There is no trustworthy historical funnel baseline if these events were not previously collected. Review the first eligible D1/D7 cohorts after release; do not treat a UI change as evidence of improved retention. Pair the numbers with a handful of observed first-time sessions and short conversations with players who did not return. Run one follow-up experiment at a time.

## Development and release checks

```bash
npm run dev
npm run dev:mindloop-web -- --port 5488
npm run build:mindloop-web
npx vitest run src/features/mindloop src/shared/mindloop apps/mindloop-web/src
```

Use a separate frontend port in each worktree. The frontend proxies `/api/mindloop` to `localhost:3111`. A browser without a dev or Telegram identity remains device-only.

Before releasing, verify signed launches on Telegram iOS and Android, reopening from a second device, a save during an offline/reconnect cycle, device-local day rollover, reminder permission denial and opt-out, and compact layouts with the client’s actual safe areas. Browser emulation and mocked API tests cannot establish those external-client behaviors. After release, inspect events before drawing retention conclusions.

## Related documentation

- [Bot and Web Feature Overview](/bots/overview)
- [Database Architecture](/architecture/database)
- [Project Structure](/architecture/project-structure)
