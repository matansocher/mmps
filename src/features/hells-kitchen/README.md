# Hell’s Kitchen (web recreation)

A private browser recreation of _Hell’s Kitchen: The Game_ (2008, PC), served at `/hells-kitchen/`. Plan: `plans/hells-kitchen-recreation.md`.

## Layout

| Path                      | Role                                                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game/`                   | Deterministic simulation (`engine.ts`), content (`content.ts`: 36 career days, Arcade, 35 recipes, ranks), types and the zod save schema. Shared by server and client. |
| `api/`                    | Auth (HMAC session cookie, login throttling) and the save API (`/api/hells-kitchen/*`).                                                                                |
| `mongo/`                  | `HellsKitchen.profiles` repository. It holds one document (`_id: 'personal'`), and saves are revision-guarded (409 on conflict).                                       |
| `hells-kitchen.init.ts`   | Registers the API, auth-guards `/hells-kitchen/game-assets/*`, and serves the built SPA.                                                                               |
| `apps/hells-kitchen-web/` | Phaser 3 + Vite client (800×600 stage). DOM screens are in `main.ts` and the canvas scene is in `game/scene.ts`.                                                       |

## Commands

```bash
npx vitest run src/features/hells-kitchen          # engine, content and bot playthroughs of every day
npm run build:hells-kitchen-web                     # typecheck + Vite build
npx tsx apps/hells-kitchen-web/scripts/build-assets.ts   # art/source/*.png -> public/game-assets/*.webp

# Mongo-free preview (file-backed save in .tmp/)
HELLS_KITCHEN_APP_PASSWORD=chef HELLS_KITCHEN_API_PORT=3391 npx tsx apps/hells-kitchen-web/dev-server.ts
HELLS_KITCHEN_WEB_PORT=5391 HELLS_KITCHEN_API_PORT=3391 npm run dev:hells-kitchen-web
```

The Vite dev server serves `public/` without auth. Check private media against Express after a build: the preview backend also serves `dist/`.

In development builds, a read-only inspector `window.__hellsKitchen` exposes the run, profile, screen and recipes for browser tests.

## Assets

Editable masters live in `apps/hells-kitchen-web/art/source/`. They are never served directly. The build script removes the matte by flood-filling from the image border with feathering (white for people, black for ingredients), then writes resized WebP files. Runtime art totals about 600 KB. The red kitchen texture is generated at load time by shifting the blue tiles to red. Food on pans and plates is cut from the prep-bowl sprites. Voice cues are recreated WAV lines with a 12 s cooldown; music and effects are synthesized in `lib/audio.ts`.

## Tuning

These constants are at the top of `game/engine.ts`: `PREP_SECONDS = 0.9`, `WAITER_SECONDS = 1.2`, `STOVE_SLOTS = 3`, `OVEN_SLOTS = 2`, and a 0.1 s fixed step. With these values, a frame-perfect bot earns 4–5★ on every day. The spec asserts that every career day and Arcade can be won.

## Known differences from the PC original

- All art, voice and music are new recreations, not original assets. Chef voice lines are sound-alike cues, not recordings.
- Recipe names and prose, day scripts, patience values and cooking times are estimates tuned for pacing, not measured from the original.
- Characters are static sprites with a two-frame walk and cropped seated poses. The original had full 3D animation.
- Oven dishes cook at the station burners, using a roasting tray and oven glow, rather than inside a separate oven view.
- Kitchen-test days (8, 15, 22, 29) auto-serve both kitchens instead of recreating the original's team-challenge scripting.
