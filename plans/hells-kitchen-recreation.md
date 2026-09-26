# Hell’s Kitchen PC recreation — implementation plan

Planning date: 2026-09-25. Creative direction updated: 2026-09-26. Planning only; no application implementation in this change.

## 1. Overview and agreed scope

Build a personal-use browser recreation of **Hell’s Kitchen: The Game (2008), PC edition**, served by the existing MMPS Express server at `/hells-kitchen/`. Include the complete single-player Career and Arcade experience, mouse controls, and a close reconstruction of the original presentation. The user has no original game files, so artwork and audio must be newly produced from references. Desktop is the target; phone and Telegram layouts are outside this implementation.

Use a Vite + TypeScript + Phaser frontend, a deterministic TypeScript simulation, and a small Express/MongoDB backend for private access and saved progress. This is a standalone web feature, initialized independently of bot selection, like Savings and Mindloop. No new bot, scheduler, AI agent, or runtime AI calls are needed.

The fidelity objective is recognizable scene composition, interactions, pacing, progression, and atmosphere. Exact source assets, recordings, frame-for-frame animation, and original internal formulas are unavailable. Record approximations explicitly; a visually similar screen alone does not establish full-game parity.

**User-confirmed creative direction:** make the experience as similar to the PC original as possible. When original details cannot be established, create finished replacements that preserve its atmosphere and make play satisfying and understandable. The user authorizes creative judgment for missing sounds, animations, reactions, and tuning. Research uncertainty must not leave required features unfinished or repeatedly require user decisions. Keep reconstruction notes in development documentation, away from normal gameplay.

## 2. Reference baseline and remaining research

The supplied screenshot is the starting visual reference. It shows a fixed dining-room view, burgundy and gold furnishings, blue illuminated accents, cream tablecloths, chandeliers, a large chef portrait in the upper-left, and an inset tutorial panel. These observations come from the image, not from its embedded instructions. Ignore the image viewer’s bottom strip and search icon when reconstructing the game.

Published descriptions report Career and Arcade, a 36-day career, five ranks, and 35 recipe unlocks. Use those as the provisional completeness checklist; confirm the PC edition’s day numbering, tutorial treatment, unlock mapping, and exact menu contents before authoring the campaign. Console-specific multiplayer is outside the chosen PC single-player scope. [Game overview](https://en.wikipedia.org/wiki/Hell%27s_Kitchen%3A_The_Game)

The original loop combines preparation, cooking, and service, with chef judgment and increasingly complex orders. Arcade applies continued order pressure with time/chef-patience limits. Its exact scoring, escalation, and ending rules still need PC footage verification. [Contemporary announcement](https://www.gamedeveloper.com/game-platforms/ubisoft-announces-em-hell-s-kitchen-the-video-game-em-)

The walkthrough describes queued waiter/preparation tasks, color-coded ingredient bowls, full-table delivery, cooking synchronization, cooling and burning penalties, replayable days, multi-course service, and recurring red/blue kitchen tests with later oven use. These mechanics belong in the reference checklist. Measure numeric timing and failure/reset semantics where references permit; otherwise tune documented replacement values through playtesting. [Gameplay walkthrough](https://www.gamezebo.com/walkthroughs/hells-kitchen-tips-walkthrough/)

Research status: repository integration points and written gameplay sources inspected; full PC playthrough footage has **not** been watched or measured. A [late-game video](https://www.youtube.com/watch?v=eX0CVqpr3xU) and [PC screenshot gallery](https://gamefaqs.gamespot.com/pc/943799-hells-kitchen-2008/images?pid=943799) are reference leads, not completed evidence.

First implementation milestone must produce a reference pack:

| Deliverable | Required contents |
|---|---|
| Screen inventory | Title, profiles if present, mode selection, calendar, briefing, tutorial, dining room, kitchens, pause/options, result/failure, recipe collection, ending/credits. Mark observed versus unconfirmed screens. |
| Day inventory | One row per day: PC source and timestamp, objectives, room, available equipment, customer/order pattern, courses, unlocks, and pass/fail conditions. |
| Behavior measurements | Queue rules, click-versus-drag actions, movement/preparation times, timer boundaries, quality decay, anger changes, and retry behavior. |
| Visual board | Unobstructed scene references, furniture landmarks, character size, typography, material samples, hover/selection states, transitions, and animation examples. |
| Audio cue sheet | Music/ambience categories, effects, chef reaction triggers, priority, interruption, cooldown, and subtitles. |
| Confidence ledger | Each rule/asset is observed, corroborated, inferred, or approximated; each inference has a verification task. |

Do not silently combine PC, Wii, DS, and later mobile game behavior. If references cannot establish a detail, use a documented approximation and keep it on the fidelity gap list.

For each unresolved detail, inspect the available PC references, choose a replacement consistent with established behavior, and validate it in a complete service. Revisit the choice if better evidence appears. Missing evidence is a reason to make an informed design decision, not to shrink Career/Arcade coverage or stall implementation indefinitely.

## 3. Visual reconstruction

### Composition and rendering

Use an initial **800 × 600 logical stage**, based on the supplied approximately 4:3 composition. This is a proposed working coordinate system, not a verified native resolution. Confirm framing from clean PC references before locking coordinates. Preserve the full composition with centered, proportional scaling and letterboxing; fullscreen must not crop interactive areas.

Render the fixed perspective with layered artwork: background architecture, furniture backs, characters, furniture fronts, counters, lighting/effects, and interface. Place characters using floor anchors, perspective-dependent scaling, and authored walk paths. Split tables and chairs into occluding layers so seated characters and moving staff occupy the room convincingly. Camera movement is unnecessary unless a verified screen needs it.

Keep the observed warm lighting, dark wood, metallic trim, blue glass highlights, realistic proportions, and period-appropriate shaded buttons. Match screen density, portrait placement, tutorial box proportions, and cursor feedback. Gameplay UI belongs inside the stage. Browser login and save-conflict dialogs can use small HTML overlays that visually fit the game.

### Asset production pipeline

1. Create reference boards and measured layouts before final art. Label each source and its target screen.
2. Produce dining-room and kitchen master images at a higher working resolution, then export layers to the stage coordinates. Build clean backgrounds without interface text or characters baked in.
3. Establish one consistent character sheet per customer/staff archetype. Produce directional walk, idle, sit, order, serve, eat, and reaction states needed for complete interactions. Reconstruct observed motion closely and author missing transitions to fit. Keep lighting, pivots, and scale consistent between frames.
4. Recreate the chef panel and required reaction poses to match the reference composition. Portrait animation and spoken lines are separate deliverables; a static placeholder does not count as completed presentation.
5. Produce utensils, bowls, dishes, timers, state indicators, buttons, cursor states, and effects as separate assets. Render text in the engine for sharp scaling and correct wrapping.
6. Pack transparent sprites into atlases with explicit pivots, frame durations, and hit areas. Keep source artwork separate from optimized runtime files. Document every asset in a manifest.
7. Produce coherent music, dining ambience, preparation/cooking/serving sounds, and replacement chef reactions. The default audio plan uses recreated sound and a distinct performed voice with subtitles; the original recordings and an exact Ramsay voice are not promised.

AI image generation can help create base artwork, but individual generated frames are not sufficient for consistent animation. Expect manual compositing, cleanup, and potentially a small rigged character workflow. Use the image-generation skill during actual asset creation. Asset polish is a substantial part of the project, not a final cosmetic pass.

### Sound, feedback and atmosphere

The following are proposed creative replacements, not claims about the original soundtrack. Judge them together with the visuals and action timing during actual play:

| Layer | Creative direction | Player experience check |
|---|---|---|
| Dining ambience | Restrained conversation, occasional cutlery/glass sounds and soft room tone; smooth variation rather than an obvious short loop. | The room feels occupied without masking service cues. |
| Kitchen ambience | Ventilation, sizzling, bubbling and utensil sounds tied to active stations, with controlled overlap. | Players can hear activity and changes without a wall of noise. |
| Interaction effects | Short, tactile responses for accepted clicks, ingredient preparation, placing cookware and serving; separate cues for rejected actions. | Each action feels responsive and its result is clear. |
| Urgency | Distinct ready/warning/failure cues, supported by visible indicators; restrained increases in musical tension. | Pressure rises before a mistake becomes irreversible; cues remain distinguishable in a busy service. |
| Chef reactions | Brief, forceful coaching, frustration and earned praise matched to expressions and subtitles; prioritize relevant events, vary lines and use cooldowns. | Feedback feels connected to the player's performance and never becomes constant interruption. |
| Music and results | Newly composed television-kitchen-style tension, a calmer menu treatment, and concise success/failure phrases. | A service has a satisfying build-up and release; loops and transitions are unobtrusive. |

Mix voice and critical cues above ambience; lower competing music briefly when necessary. Provide separate music, effects and voice volume controls. Pair audible warnings with visual feedback so muted play remains fully understandable. No generic beep-only soundscape or silent placeholder counts as finished audio.

Introduce a representative sound mix in the first playable service. Playtest calm, crowded, near-failure and successful runs with sound enabled. Tune cue timing, voice frequency and animation response together until pressure feels demanding but fair. Assess closeness to the original wherever comparison is available, and coherence with the established game where it is not.

### Visual acceptance gate

Before campaign expansion, compare the reconstructed dining room and kitchen against references at the same viewport. The supplied dining-room screenshot alone cannot establish the kitchen design. Require matching major landmarks, perspective, light/color balance, character scale, interface layout, and legible text. Capture idle and busy states and a complete animated interaction. Maintain a short list of remaining differences; iterate on scene art before adding dozens of levels.

## 4. Complete product scope

| Area | Planned deliverable | Completion evidence |
|---|---|---|
| Front end | Loading, mode selection, profile/save presentation supported by PC references, settings, pause, return-to-menu. | Every reference screen mapped and navigable. |
| Tutorial | Scripted prompts and input gating tied to actual game state. | A fresh save teaches the full opening flow without dead ends. |
| Dining room | Customer lifecycle, table occupancy, waiter movement/action queue, service indicators and scene transitions. | Recorded scenario matches the reference interaction sequence. |
| Kitchen | Ingredient/station/order state machines, pointer interactions, timers, quality evaluation and recovery. | Scripted early and late service scenarios finish correctly. |
| Chef feedback | State-driven expressions, pressure display, subtitle/audio reactions, success/failure presentation. | Reactions follow documented triggers without repeated audio spam. |
| Career | Every verified day, challenge, equipment change, rank, result, retry, replay and ending. | Completed day matrix, with each approximation disclosed. |
| Arcade | Separate configuration and progression matching researched PC rules. | Entry, escalation, results and failure tested as a complete mode. |
| Recipe collection | All verified unlock slots, browser, illustrations and print view. | Correct unlock associations; recreated descriptions labeled in content notes. |
| Sound | Music, ambient layers, action feedback, reactions and persisted volume/mute settings. | Audible cue checklist and muted-session test. |
| Saves | Career progress, records, unlocks, preferences, and one resumable active run. | Refresh, restart, repeat play and another authenticated browser preserve valid progress. |

Treat completed campaign content and asset coverage as release requirements. A playable first service is a milestone within this scope, not the final deliverable. Do not add unrelated building/upgrading economies, multiplayer, monetization, or procedural levels to fill gaps in reference knowledge.

## 5. Architecture and data flow

Choose Phaser for stage rendering, sprite animation, mouse input, audio and scene lifecycle. Use its documented scene and scale systems; lock a tested release during implementation instead of selecting a version from memory. [Scenes](https://docs.phaser.io/phaser/concepts/scenes), [proportional stage scaling](https://docs.phaser.io/phaser/concepts/scale-manager)

Use plain TypeScript for this workspace. React is unnecessary for the game canvas; limited account/save overlays can be DOM elements. Existing React mini-apps remain architectural references for hosting and persistence, not a requirement to reuse their visual components.

The simulation owns the full active run. Dining and kitchen views project that state; switching views never stops offscreen work. A single simulation clock advances at a fixed step, independently of animation frame rate. Rendering interpolates positions. Seeded randomness, explicit commands and events make scenarios reproducible. Menus, focus loss, and browser suspension pause the clock and audio; resuming requires an explicit action and never fast-forwards missed wall time. This pause policy is a deliberate browser adaptation.

Keep the state machine separate from Phaser and DOM APIs. Use authored paths and occupancy rules rather than introducing physics for a fixed restaurant layout. The renderer must not award scores, consume ingredients, or complete actions from animation callbacks.

Data flow:

1. Browser visits `/hells-kitchen/`; a small login shell checks the feature session.
2. Successful password login sets an HttpOnly session cookie. Only then load protected game assets and request the saved profile.
3. Validate/migrate the local save and compare it with the server revision. Resolve any divergent pending save before replacing it.
4. Selecting a day/mode constructs a run from versioned content and a seed, or restores a validated paused snapshot.
5. Mouse input becomes a command. The engine validates it, advances state and emits events. Views and audio consume those events.
6. Save a local snapshot at meaningful transitions, on pause, and periodically during a run; do not depend solely on unload handlers.
7. On result or explicit save, the API controller validates a bounded payload and calls the repository with the expected revision. Mongo returns the new revision or HTTP 409 with the current save.
8. Failed network saves leave the local pending copy intact. A conflict offers the user a clear local/server choice; never silently overwrite or combine incompatible active runs. Local storage failure shows an actionable save warning while keeping the active run in memory.

No WebSocket or per-frame server traffic. The server is responsible for authentication, static delivery and save validation, not real-time simulation or competitive score enforcement.

## 6. Files to create

All paths below are relative to the MMPS repository root. Reference paths are existing files inspected for this plan. Novel game rendering work has no Phaser equivalent in the repo; the engine documentation above is its API reference.

| New path | Purpose and key contents | Existing reference |
|---|---|---|
| `apps/hells-kitchen-web/package.json` | Private workspace; dev/build/typecheck scripts; Phaser/Vite/TypeScript dependencies. | `apps/mindloop-web/package.json` |
| `apps/hells-kitchen-web/tsconfig.json` | Browser and tooling types; frontend checks include specs. | `apps/savings-web/tsconfig.json` |
| `apps/hells-kitchen-web/vite.config.ts` | `/hells-kitchen/` base, API proxy, strict unique dev port, `dist` output. | `apps/savings-web/vite.config.ts` |
| `apps/hells-kitchen-web/index.html` | Canvas and accessible overlay mount. | `apps/savings-web/index.html` |
| `apps/hells-kitchen-web/src/main.ts` | Bootstrap authentication and game; teardown event listeners. | `apps/savings-web/src/main.tsx` (bootstrap role only) |
| `apps/hells-kitchen-web/src/style.css` | Stage fit, surrounding page, focus treatment and overlays. | `apps/savings-web/src/index.css` (stylesheet placement only) |
| `apps/hells-kitchen-web/src/game/types.ts` | Run entities, commands, events, content and asset contracts. | `apps/mindloop-web/src/games/railrouter/model.ts` |
| `apps/hells-kitchen-web/src/game/engine.ts` | `createRun`, `applyCommand`, `advanceRun`, snapshot validation. | `apps/mindloop-web/src/games/railrouter/engine.ts` |
| `apps/hells-kitchen-web/src/game/dining.ts` | Table/customer lifecycle and waiter queue/path rules. | `apps/mindloop-web/src/games/railrouter/engine.ts` |
| `apps/hells-kitchen-web/src/game/kitchen.ts` | Ingredient, station, dish and timing rules. | `apps/mindloop-web/src/games/railrouter/engine.ts` |
| `apps/hells-kitchen-web/src/game/judgment.ts` | Measured quality/pressure/rating rules; no presentation dependencies. | `apps/mindloop-web/src/games/reaction-progression.ts` |
| `apps/hells-kitchen-web/src/game/content.ts` | Validated career, arcade, tutorial, recipes and feedback definitions; split by content category if size warrants it. | `apps/mindloop-web/src/games/railrouter/levels.ts` |
| `apps/hells-kitchen-web/src/game/game.ts` | Phaser configuration, scene registration, shared run owner and clock. | `apps/mindloop-web/src/main.tsx` (lifecycle boundary only) |
| `apps/hells-kitchen-web/src/game/scenes/boot.scene.ts` | Manifest loading, progress, asset failure/retry. | `apps/mindloop-web/src/pages/GameShell.tsx` (loading/lifecycle role) |
| `apps/hells-kitchen-web/src/game/scenes/menu.scene.ts` | Mode/calendar/recipe/settings screens, result and continuation navigation. | `apps/mindloop-web/src/pages/GameShell.tsx` (navigation role) |
| `apps/hells-kitchen-web/src/game/scenes/service.scene.ts` | Dining/kitchen render layers, hit testing, sprite motion and reference-aligned HUD. | `apps/mindloop-web/src/games/railrouter/RailBoard.tsx` (render projection role) |
| `apps/hells-kitchen-web/src/lib/audio.ts` | Sound mixing, cue priority and user-gesture audio activation. | `apps/mindloop-web/src/lib/sound.ts` |
| `apps/hells-kitchen-web/src/lib/storage.ts` | Versioned local progress/run/preferences and migration. | `apps/mindloop-web/src/lib/storage.ts` |
| `apps/hells-kitchen-web/src/lib/api.ts` | Auth/profile requests and explicit conflict response handling. | `apps/savings-web/src/lib/api.ts` |
| `apps/hells-kitchen-web/src/lib/save-sync.ts` | Pending-save retention and conflict resolution. | `apps/mindloop-web/src/lib/player-sync.ts` |
| `apps/hells-kitchen-web/src/ui/overlays.ts` | Login, recovery, save status and conflict dialogs. | `apps/savings-web/src/components/StateScreens.tsx` (state presentation role) |
| `apps/hells-kitchen-web/public/game-assets/manifest.json` | Scene/atlas/audio inventory, dimensions, pivots, versions and filenames. | `apps/mindloop-web/src/lib/games.ts` (typed content registry role) |
| `apps/hells-kitchen-web/public/game-assets/` | Optimized backgrounds, sprites, fonts, effects and audio named in the manifest. | `apps/mindloop-web/src/components/GameArt.tsx` (artwork integration role only) |
| `src/features/hells-kitchen/types.ts` | Persisted profile, save request/result and DTO contracts. | `src/features/savings/types.ts` |
| `src/features/hells-kitchen/constants.ts` | Database, collection, session, body-size and save-version constants. | `src/features/savings/constants.ts` |
| `src/features/hells-kitchen/api/auth.ts` | Feature-specific session signing/verification and cookie parsing. | `src/features/savings/api/auth.ts` |
| `src/features/hells-kitchen/api/auth.middleware.ts` | Session checks for API and protected media. | `src/features/savings/api/auth.middleware.ts` |
| `src/features/hells-kitchen/api/dto.ts` | Bounded validation, migration policy and serialization. | `src/features/savings/api/dto.ts` |
| `src/features/hells-kitchen/api/hells-kitchen.api.controller.ts` | Login/logout/session/profile routes and error responses. | `src/features/savings/api/savings.api.controller.ts` |
| `src/features/hells-kitchen/mongo/profile.repository.ts` | `getProfile`, revision-guarded `saveProfile`. | `src/features/savings/mongo/savings.repository.ts` |
| `src/features/hells-kitchen/hells-kitchen.init.ts` | Mongo setup, API registration, protected assets, static shell and SPA fallback. | `src/features/savings/savings.init.ts` |
| `src/features/hells-kitchen/index.ts`, `api/index.ts`, `mongo/index.ts` | Named feature exports; the latter two sit under the same feature directory. | Corresponding `src/features/savings/` barrels |
| Colocated `*.spec.ts` files for engine/dining/kitchen/judgment/content/storage/sync/auth/DTOs | Scenarios specified in section 10; repository integration tests use the existing test harness. | `apps/mindloop-web/src/games/railrouter/engine.spec.ts`, `src/features/savings/api/auth.spec.ts` |

During implementation, keep reference captures, timing notes and editable art masters outside the public runtime asset directory. Add a feature README containing the reference ledger, asset provenance, content coverage, commands and remaining fidelity differences. Follow `AGENTS.md` conventions even where older reference files use defaults or JSDoc.

## 7. Files to modify

| Existing path | Change |
|---|---|
| `src/index.ts` | Import/call `initHellsKitchen(app)` with its own try/catch and `failedComponents` entry, independent of `LOCAL_ACTIVE_BOT_ID`. |
| `package.json` | Add `dev:hells-kitchen-web` and `build:hells-kitchen-web`; append the workspace build to `build:web-apps`. `apps/*` already discovers it. |
| `package-lock.json` | Update through npm after choosing verified compatible dependency versions. |
| `vitest.config.ts` | Include `apps/hells-kitchen-web/src/**/*.spec.ts`; currently frontend tests are enumerated by workspace. |
| `.env.example` | Document `HELLS_KITCHEN_APP_PASSWORD`; reuse `MONGO_DB_URL`. |
| `AGENTS.md` | Document feature URL, commands, auth, database and asset/content boundaries once implemented. |

The existing ESLint `apps/*/src/**/*.{ts,tsx}` scope already covers this app. Root typechecking excludes app workspaces, so the new workspace build must explicitly typecheck both browser source and specs. CI already runs the root build/tests/lint; it needs no additional job unless browser regression tests are made persistent. Do not modify unrelated apps or generalize their auth as part of this feature.

## 8. Type definitions and persistence contract

These are planned boundary signatures, not implementation. Simulation entities will be refined after the reference pass. Use readonly properties, named exports, pure functions for rules/repositories, and classes only for stateful services/scenes.

```typescript
export type GameMode = 'career' | 'arcade';
export type ViewId = 'dining' | 'red-kitchen' | 'blue-kitchen';
export type Stars = 0 | 1 | 2 | 3 | 4 | 5;

export type DayDefinition = {
  readonly id: number;
  readonly kind: 'service' | 'kitchen-test';
  readonly layoutId: string;
  readonly rulesId: string;
  readonly arrivalScheduleId: string;
  readonly recipeIds: readonly string[];
  readonly tutorialId?: string;
};

export type RunHeader = {
  readonly id: string;
  readonly mode: GameMode;
  readonly dayId?: number;
  readonly contentVersion: string;
  readonly seed: number;
  readonly randomState: number;
  readonly tick: number;
  readonly view: ViewId;
  readonly status: 'running' | 'paused' | 'won' | 'lost';
};

export type GameCommand =
  | { readonly type: 'interact'; readonly targetId: string }
  | { readonly type: 'drop'; readonly sourceId: string; readonly targetId: string }
  | { readonly type: 'switch-view'; readonly view: ViewId }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' };

export type CampaignProgress = {
  readonly unlockedDayIds: readonly number[];
  readonly bestStars: Readonly<Record<number, Stars>>;
  readonly unlockedRecipeIds: readonly string[];
  readonly completedTutorialIds: readonly string[];
};

export type ProfileEnvelope<TProfile> = {
  readonly schemaVersion: number;
  readonly revision: number;
  readonly profile: TProfile;
  readonly updatedAt: string;
};

export type SaveResult<TProfile> =
  | { readonly status: 'saved'; readonly save: ProfileEnvelope<TProfile> }
  | { readonly status: 'conflict'; readonly save: ProfileEnvelope<TProfile> | null };
```

Persist one private profile document in database `HellsKitchen`, collection `profiles`, with `_id: 'personal'`. Profile content includes campaign progress, reference-defined arcade records, and an optional active-run snapshot. Keep audio/fullscreen preferences device-local. The snapshot must include every authoritative entity, action queue, remaining timer, RNG state and judgment state; sprite objects and Phaser timers are never serialized. Do not invent an arcade numerical score if the reference uses a different result measure.

Use separate schema and content versions. Restore an active run only when its content definition is compatible; otherwise preserve career progress and offer restart of the interrupted day. Never discard a save simply because its migration fails. Validate IDs, finite ranges, array limits, payload size, and reachable state relationships. Do not add a TTL to personal progress.

Proposed API: `POST /api/hells-kitchen/auth/login`, `POST /auth/logout`, `GET /auth/session`, and `GET/PUT /api/hells-kitchen/profile` (auth routes share the same `/api/hells-kitchen` prefix). PUT requires the expected revision and returns 409 on conflict. Use the Savings cookie/rate-limiting pattern with feature-specific names and secret. Because this is for private use, register the `/hells-kitchen/game-assets/` auth guard before static serving; a secret URL is insufficient. Keep the login shell reachable and fail closed if the password is absent.

## 9. Dependencies and implementation order

New runtime frontend dependency: `phaser`, version selected and locked after checking the official supported API and Node/Vite compatibility. Reuse repository tooling: Vite, TypeScript, Vitest, Express, MongoDB, Zod and rate limiting. No new external API, AI subscription, Telegram token, or paid asset service is required at runtime. Asset creation may use separately available tools. No automatic asset-generation pipeline is needed in production.

| Phase | Work | Exit condition |
|---|---|---|
| 1 — Reference specification | Complete screen/day/behavior inventories; measure representative opening, middle, late and challenge play; resolve unknown Arcade rules through evidence or documented design choices. | Version-specific baseline with a concrete implementation decision for each unresolved detail. |
| 2 — Visual proof and app shell | Workspace/config/init; stage scaling; polished dining-room and kitchen assets; one animated character; original-layout UI. | Both scenes pass the visual acceptance gate, with working private preview. |
| 3 — Simulation and one complete service | Types/content, clock/commands, dining and kitchen modules, judgment, tutorial, result/retry and representative sound mix. | Start-to-finish service works at different frame rates; visuals, audio and controls feel coherent together. |
| 4 — Persistence and access | Auth/DTOs, repository, routes, local snapshots, revision handling, load/resume and private asset checks. | A service survives refresh; conflicts and network loss cannot silently lose progress. |
| 5 — Full Career | Author all verified days and challenges; progression, unlocks, calendar/replay and ending; finish additional assets. | Every day playable and content inventory complete. |
| 6 — Arcade and collection | Full Arcade loop, recipe browser/print, final settings/navigation. | Complete second mode and all collection entries, with unknowns resolved or disclosed. |
| 7 — Audio, fidelity and release checks | Final animation/audio, measured timing comparisons, performance, browser tests and production build verification. | Completion checklist below passes; remaining fidelity differences are documented. |

Art and audio work continues throughout phases 2–7. Do not postpone character consistency until after campaign authoring. Prioritize high-impact work in this order: room perspective and lighting, character placement/movement, interaction timing, interface details, then minor effects.

A reliable time estimate depends on phase 1 and the visual proof. The largest uncertainty is producing consistent character animation and acquiring enough PC reference coverage. This is a substantial game project, not a single-screen mini-app. Keep phases separately reviewable while retaining the full agreed scope.

## 10. Testing and definition of done

Tests should exercise behavior, not repeat implementation details:

- Engine/dining: queue order, invalid/repeated clicks, table reservations, movement completion and scenario progression; identical seeded commands produce identical results.
- Kitchen/judgment: timer boundaries, resource consumption, valid/invalid drops, quality transitions, recovery, and terminal outcomes based on measured scenarios.
- Cross-view timing: hidden rooms keep advancing; render frame rate does not change outcomes; pausing/focus loss prevents simulation catch-up.
- Content: unique IDs, valid references, complete day/unlock graph, asset manifest coverage, reachable endings and both mode configurations.
- Saves: round-trip active run, schema migrations, unavailable local storage, corrupt payloads, network failure, stale writes, first-save races and explicit conflict choices.
- Auth/API: missing/expired session, login throttling, private media cannot be fetched anonymously, correct API/asset routing, DTO rejection and repository conflict behavior.
- Browser journeys: new profile → tutorial → completed service → next day; failure → retry; calendar replay; kitchen test; late-career completion; Arcade ending; recipe unlock/print; refresh → paused resume; logout/login.

During implementation, use the Playwright skill for browser validation. Canvas checks must combine actual mouse interactions and screenshots with a development-only read-only state inspector; a canvas merely appearing is not evidence that gameplay works. The inspector must be excluded from production builds.

Verify at 800×600 logical size within desktop windows such as 1280×800 and 1920×1080, normal and high-DPI displays, and fullscreen. Target stable 60 FPS on the user's desktop; verify a heavily populated scene, scene switching, atlas memory use and startup transfer size before setting final budgets. Check Chrome and Safari. Audio must start after a user gesture, and play must remain possible when audio is blocked.

Run targeted specs, workspace typecheck/build, root `npm run build`, `npm run typecheck`, `npm test`, and `npm run lint`. Add necessary server integration coverage using the existing harness. Check the production subpath, nested assets, authenticated media and direct reloads against Express, not just Vite.

Use an available worktree-specific port with `strictPort: true`; 5387 is a candidate, not reserved. Proxy to the actual local backend port. Keep the preview server running for review and report its verified URL after implementation milestones. There is no UI server to start for this planning-only change.

The final recreation is complete only when:

1. The screen, campaign, mode and asset inventories are fully accounted for.
2. Career and Arcade can be played through their verified endpoints.
3. No temporary art, blank animations or debug controls remain in normal play.
4. Matched scene captures and representative play sequences satisfy the visual/timing reference checks.
5. Save/resume, private access, audio controls and browser lifecycle behavior pass validation.
6. The production build runs under the existing server without disrupting other features.
7. Any remaining differences from the PC original are explicitly recorded, especially recreated voice, recipe prose, animation and estimated timing.
8. Unrecoverable details have polished replacements. Sound-enabled playtests confirm clear feedback, consistent atmosphere, varied reactions and satisfying service pacing; no required feature is missing solely because its exact original behavior was unavailable.

The next implementation action is phase 1 followed by the two-scene visual proof. No original binary/assets, full recorded playthrough analysis, generated artwork, game code or runtime tests are included in this planning change.
