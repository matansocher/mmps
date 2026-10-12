# Rewind

Rewind is a mobile-first React puzzle game in `apps/rewind-web`, served at `/rewind/*`. Play works locally and offline. Inside Telegram, an authenticated API saves the player's journey in MongoDB so the same account can continue on another device. Rewind has no polling bot of its own.

## The journey

The home screen is a scrolling, themed stone path through **38 hand-designed rooms across nine regions**. This expands the approved six-room opening without restoring the repetitive hundred-room edition. Solve a room by reaching its exit archway. Rooms unlock sequentially; solved and skipped rooms remain replayable. Returning to the path preserves the current attempt and map position.

The valley's observatory has gone dark. The journey restores its paths, garden, waterworks, and machinery before bringing the light home at the summit. The home panorama and chapter scenery reflect completed regions; the final chapter reward reveals the illuminated observatory. Short restoration messages are part of existing chapter rewards, not extra dialogs. Story content lives in `src/game/journey.ts` and does not change puzzle rules or star requirements.

| Rooms | Region              | New concept                     | Distinct challenges                                                                |
| ----- | ------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| 1–4   | The Courtyard       | Barrels, then weighted switches | Borrowed weight; staged switch handoff                                             |
| 5–6   | The Old Vault       | Keys and locks                  | Spend a scarce key on the right route                                              |
| 7–10  | The Winter Garden   | Ice                             | Make a brake; relocate it; navigate dry islands                                    |
| 11–14 | The Forgotten Ruins | Crumbling floors                | Send cargo first; approach from behind; preserve a return route                    |
| 15–19 | The Canal Walk      | Rotating bridges                | Change axes; separate freight and foot traffic; keep the hinge clear               |
| 20–23 | The Wind Pass       | One-way gates                   | Opposing lanes; a usable landing; two deliveries through one circuit               |
| 24–28 | The Clockwork Hall  | Toggle levers                   | Opposite-polarity return routes; persistent control; a closed gate as a brake      |
| 29–33 | The Hidden Passages | Paired tunnels                  | Separate freight and crew entrances; plug a tunnel; choose unloading order         |
| 34–38 | The Observatory     | Light and mirrors               | A multi-receiver circuit; optical obstruction; leapfrog brakes; a three-job finale |

The first six rooms retain their exact maps, IDs, chapter membership, and star targets. Chapter lengths and concept introductions are explicit data, not a ten-room formula. Concepts accumulate, and later rooms may use any subset already introduced: the Observatory's “Leapfrog” is an older-mechanics mastery puzzle, not another mirror variant. Ten introductions teach the ten concepts; the other 28 rooms focus on a specific dependency. Only introductions are deliberately easy; move count is not a difficulty scale.

Each challenge has a design contract. Tests search for solutions that bypass that dependency and require those searches to be unsolvable, not merely out of budget. The handoff also requires temporary parking and a change of which barrel holds the switch. The key puzzle verifies that opening the tempting door first deadlocks and that undoing that choice restores a solution. The finale requires one barrel to serve two switches, persistent control to preserve access, and then a clear optical path. These checks prevent accidental shortcuts; player feedback still determines human difficulty and enjoyment.

There are no helpers, recordings, rewind loops, lives, timers, or move limits. Undo is unlimited, including after winning, and restores all puzzle state.

## Objects and rules

All ten mechanics appear in the published campaign. Each is introduced in a small, focused room before combinations ask the player to reason about it.

- **Barrels:** push one at a time by walking into them. They cannot be pulled or pushed into an occupied tile.
- **Weighted switches:** a traveler or barrel on a marked switch holds all gates with that mark open. Emptying the switch closes them. Engraved paths link switches and gates.
- **Keys:** collect round or square keys, then walk into their matching locks. Opening a lock consumes a key and keeps that lock open for the attempt.
- **Ice:** the traveler and pushed barrels slide to the first dry tile or stop before an obstacle. A sliding traveler does not automatically push a barrel. A whole slide costs one move.
- **Crumbling floors:** cracked tiles collapse after an occupant leaves them empty. Passing a cracked tile directly from a barrel to the traveler does not collapse it underneath the traveler.
- **Rotating bridges:** stand beside an empty bridge and turn it. Entry and exit must follow its planks. A bridge cannot be turned while occupied.
- **One-way gates:** the arrow constrains both entry and exit direction.
- **Toggle levers:** use a handle from its tile or an adjacent tile. All handles in a room share one circuit; sun and moon gates open in opposite states. The setting persists without standing on the handle.
- **Paired tunnels:** matching numbers connect, including for barrels. Transit happens once on entry, not repeatedly at the destination. A barrel needs an empty destination; the traveler stays at the entrance if the far end is occupied.
- **Light:** sources emit rightward. Adjacent mirrors can be turned to redirect the beam. Every receiver must be lit to open the star gate. Walls, barrels, and closed key locks stop light; the traveler and barred gates do not. Reflected loops terminate safely.

The SVG board shares its object artwork with introductions and Help. Tap an object to inspect it; adjacent empty tiles can be tapped to walk. When more than one usable object is nearby, select the intended object rather than rotating an arbitrary neighbor.

## Stars and skips

One star is awarded for escaping. Two require a generous move target; three require the shortest verified route. Undo removes undone moves from scoring, and hints do not penalize stars. Replaying retains the highest stars and lowest move count.

Skips start at **zero**, with no counter shown. Clearing the first chapter introduces skips and awards two. Every cleared chapter awards two once, regardless of its length and whether its rooms were solved or skipped: 18 earned skips across the complete journey. There is no separate room-five gift. The chapter reward also introduces the next region's concept. Rewards accumulate and cannot be farmed by replaying.

A skip spends one token, awards no stars, and opens the next room. Solving that skipped room later earns stars without refunding the spent token. After the entire path has been cleared, Continue returns to unsolved skipped rooms. The app distinguishes a cleared path from solving every room.

## Controls and settings

The room screen keeps the board above a thumb-friendly directional pad, Undo, Hint, and contextual object actions. The board fits the remaining viewport space, with a minimum readable tile size. Rooms with usable objects reserve their action row so approaching a bridge, lever, or mirror does not push the directional pad offscreen. Enlarged text can scroll instead of clipping controls. Help and Settings use bottom sheets on phones; there is no sidebar.

| Action                     | Keyboard              | Touch                                               |
| -------------------------- | --------------------- | --------------------------------------------------- |
| Walk                       | Arrows / WASD         | Direction buttons, board swipes, adjacent tile taps |
| Undo                       | U                     | Undo                                                |
| Use selected nearby object | E                     | Turn bridge / Pull lever / Turn mirror              |
| Restart room               | R / Esc, then confirm | Start over, then confirm                            |

Escape dismisses an open sheet instead of restarting the room. Swipes are captured only inside the board; the campaign map scrolls normally. Room URLs use `#room-ID` with stable puzzle IDs, not their displayed campaign numbers; `#map` returns home. Browser Back preserves the active attempt.

Settings provide optional synthesized Web Audio, motion reduction (also respecting the operating system preference), save status, manual sync, offline installation, and a confirmed reset of progress. Sound is off by default and starts only after a user gesture. Footsteps, rolling barrels, stone, ice, machinery, tunnels, and discoveries have distinct short sounds. Bridge planks, mirrors, and levers turn visibly; tunnel travel fades in at the destination rather than sliding through walls. Motion preferences disable these effects. No audio assets or additional packages are required.

## Persistence

### Telegram and cross-device saves

Open Rewind from the **same Telegram account** on both devices. The frontend sends signed `X-Telegram-Init-Data`; the shared mini-app authentication middleware verifies it before any database access. By default, launch Rewind through the Worldly bot, as Earth does. Set `REWIND_TELEGRAM_BOT_TOKEN` if launching through a dedicated bot instead; otherwise `WORLDLY_TELEGRAM_BOT_TOKEN` is used. Production must set `NODE_ENV=production`. A regular browser or standalone home-screen visit without a Telegram identity remains local-only; it is not silently assigned a shared account.

Mongo database **`Rewind`**, collection **`ProgressV2`**, uses the verified Telegram user ID as `_id`. Documents contain campaign version 2, progress, a compact action-replay room, revision counters, a reset epoch, and timestamps. The previous `Progress` collection is not changed. Sound and reduced-motion settings stay device-specific.

The server merges completed rooms and discoveries, keeping highest stars and lowest move counts. Skips are unioned once per room. If two offline devices spend more skips than the shared balance permits, existing server spends are kept and conflicting new spends are reported; earned stars are never discarded. A later solve does not refund a skip.

Saved rooms use a separate compare-and-swap revision. A stale device cannot overwrite a newer room silently: its attempt stays local, a notice explains the conflict, and its next move explicitly becomes the shared attempt. Normal sync resumes the latest room, reconstructing its undo history. Very long attempts (over 40,000 encoded action characters) stay local; their completed-room results still sync.

Authenticated local caches use `rewind.telegram.<userId>.v2`, isolating accounts. On the first visit, a same-account v1 cache contributes only unchanged puzzle results and known-concept acknowledgments; its old attempt, rewards, and skip spends are not assigned to new puzzles. The old cache remains untouched. Pending progress survives reloads. Sync runs after changes, on reconnect/focus, and every 30 seconds while visible. Requests time out rather than claiming a save succeeded. Signed Telegram data is kept only in session storage to allow same-tab reloads; it is never stored in the cloud document or offline asset cache. Expired Telegram sessions prompt the player to reopen the mini-app.

An unreadable authenticated cache is not overwritten automatically. Settings offers an explicit cloud recovery: it first fetches a verified save, keeps the unreadable data in `rewind.telegram.<userId>.v2.recovery-backup`, and then restores the confirmed copy. Unsynced changes in corrupt data may not be recoverable.

**Reset progress** inside Telegram resets the journey across devices and requires a connection. Its epoch prevents older offline devices from resurrecting deleted progress. Settings can explicitly import the browser's earlier local journey; it is never automatically claimed by a newly opened Telegram account.

| Endpoint                          | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `GET /api/rewind/progress`        | Read the verified player's journey                     |
| `POST /api/rewind/progress/sync`  | Merge progress and conditionally update the saved room |
| `POST /api/rewind/progress/reset` | Reset the current epoch; stale requests receive 409    |

All API responses use `Cache-Control: no-store`. Sync and reset requests require the matching `campaignVersion`, so the retired hundred-room v1 client cannot overwrite or reset this v2 campaign. Mongo connections are opened lazily for authenticated requests, so a database outage does not prevent the local game from loading.

### Local play and compatibility

Guest progress, unlock acknowledgments, skips, settings, and the current room are saved on this browser. Keys are `rewind.solo.progress.v2`, `rewind.solo.run.v2`, and `rewind.settings.v1`. The saved room contains actions and a map signature, not derived board positions; restoration rebuilds the full undo history.

The 38-room release is an additive extension of the six-room v2 campaign, not another save reset. Completed opening chapters keep their membership and their four earned skips. All existing stars, discovery acknowledgments, and compatible attempts remain valid locally and in Mongo. New content starts at room 7 (stable ID 201). Newly authored rooms use IDs 201–231 and 234. A client still running the six-room bundle must update to display these rooms; it reports unfamiliar cloud room data rather than silently discarding it.

Previous-version saves remain untouched. From the hundred-room edition, only unchanged puzzle IDs **1, 11, and 21** retain results; they are now displayed as rooms 1, 2, and 5. New challenges have IDs 101–103 and start without stars. Old attempt tapes and retired-room results remain in their original storage keys. A new save or reset never reimports the archived edition on later visits.

From the earliest `rewind.progress.v2` save, only old rooms 2 and 3 still match; they map to IDs 1 and 11. That migration retains only provable stars and does not invent a best move count. Incompatible saved attempts start fresh with a notice; unreadable progress is not overwritten automatically. Storage and audio failures are reported, and the game remains playable in memory.

### Offline installation

Production builds emit a versioned service worker and an install manifest, with no PWA dependency. The worker atomically caches the HTML, bundled code, styles, and app icon for the published campaign. It handles only Rewind's app shell and listed static assets, never API requests or Telegram credentials. Updates wait for the player's **Update game and reopen** action in Settings; local moves are saved before reloading. Offline support requires HTTPS or localhost and a successful initial online load.

Where supported, Settings offers an Install button. Other browsers use their Add to Home Screen command; on iPhone use Safari's Share menu. Installation does not create an account or transfer Telegram identity into an unrelated standalone browser session.

## Backend and development

`initRewind(app)` in `src/features/rewind/rewind.init.ts` registers the API and serves `apps/rewind-web/dist`, with an `index.html` fallback for `/rewind/*`. It boots regardless of `LOCAL_ACTIVE_BOT_ID`. Vite uses `base: '/rewind/'`.

```bash
npm run dev:rewind-web -- --host 127.0.0.1 --port 5275 --strictPort
npm run dev:rewind-api
npm run build:rewind-web
npx vitest run apps/rewind-web/src src/features/rewind src/shared/rewind
npx tsx apps/rewind-web/scripts/verify-levels.ts
npx tsx apps/rewind-web/scripts/verify-levels.ts --write-targets
```

The Vite development preview unlocks all 38 rooms for playtesting, including direct room links and saved attempts. This does not mark rooms completed or grant stars or skips; actual play still saves normally. Production builds keep sequential unlocking.

The optional Rewind-only development server uses port 5276, loads this worktree's `.env`, and does not start any bots. Configure `MONGO_DB_URL` before using cloud saves. The frontend proxies `/api/rewind` there. In local development only, `?devUser=<positive-id>` supplies `X-Rewind-Dev-User`; use the same ID in two browser profiles to test synchronization. Anonymous requests have no default shared user. The development header is rejected in production.

Tests cover two-device merges, offline queues, account isolation, conflicting spends/rooms, reset epochs, signed authentication, and Mongo compare-and-swap retries. Database operations are mocked in the automated suite; a live Mongo deployment still needs its configured-connection smoke test.

The pure `step(state, action)` function is shared by the UI, save restoration, and finite-state BFS solver. Search keys include all dynamic puzzle state; predecessor links reconstruct shortest action sequences. Exhaustion is reported separately from unsolvability. Tests solve every published room, verify star targets and cumulative concept availability, enforce each challenge's design contract, and cover mechanics, undo, persistence, migration, and skip accounting. Constrained searches verify that key dependencies cannot be bypassed; searches from intermediate states verify bad choices and recovery. Solvers run in authoring/tests, not during normal play.

The shared catalog in `src/shared/rewind/campaign.ts` defines stable IDs, campaign order, chapter membership, and introductions. UI numbering and server rewards use that same catalog. A redesigned puzzle gets a new ID; reordering never transfers stars to an unrelated map. Opening maps live in the app's `src/game/levels.ts`; expanded content is in `src/game/release-rooms.ts`. Challenge dependencies live in `test/room-designs.ts` and `src/game/solver.spec.ts`. `scripts/verify-levels.ts --write-targets` updates `level-targets.ts` only after every room solves. Its optional `--proof-file=/tmp/rewind-solutions.json` exports replayable routes for browser verification.

ASCII map symbols:

| Symbols                     | Meaning                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `#`, `.`, `S`, `E`, `C`     | Wall, floor, start, exit, barrel                                |
| `a`–`f`; `A`, `B`, `D`, `F` | Weighted switches and matching gates (`C` and `E` are reserved) |
| `k` / `K`, `j` / `J`        | Round and square key/lock pairs                                 |
| `~`, `,`                    | Ice, crumbling floor                                            |
| `-`, `\|`                   | Horizontal and vertical bridge                                  |
| `^`, `>`, `v`, `<`          | One-way gates                                                   |
| `l`, `G`, `H`               | Lever, sun gate, moon gate                                      |
| `0`–`9`                     | Numbered tunnel pairs; exactly two of each number               |
| `*`, `/`, `\`, `o`, `L`     | Right-facing source, mirrors, receiver, light gate              |
