# Earth — Find the Country

Earth is a public geography quiz on a 3D globe. It is built with React and CesiumJS, and Express serves it at `/earth/*`. It needs no login, no database and no API keys.

## How it plays

The globe is a plain political map: blue ocean, every country a white surface with grey borders and no names. Spin and zoom it, then click the country you are asked for. Clicking water or space only shows a hint and is not counted as a guess.

The design is neutral, with no theme: a dark panel and one blue accent colour. The start screen is a plain **menu** with your level, XP bar and collection count on top, then the modes. Continent sprint and Continent cleanup each collapse into one row that expands to list the six continents. Pick one (press `M` or the close button to come back to the menu):

| Mode | Rules |
| --- | --- |
| **Daily challenge** | 10 countries, the same for everyone on a given day, worth 1.5× XP. It can be played once per day; the row shows your result until tomorrow. |
| **Classic** | 10 countries from anywhere on Earth, one try each. Correct: the country turns green and the next question follows. Wrong or skipped: your pick turns red, the right country turns green and the camera flies to it. |
| **Continent sprint** | Classic rules, limited to one continent (Africa, Asia, Europe, North America, South America or Oceania). The camera starts over that continent. A round has up to 10 questions; Oceania has 7. |
| **Name it** | The reverse quiz: a country lights up and the camera flies to it, and you pick its name from 4 options. The 3 wrong options come from the 6 countries closest to it, so they are hard to tell apart. Press `1`–`4` to answer. |
| **Continent cleanup** | Find every country on one continent, in random order. You get 3 tries per country. Found countries stay green, so the continent fills in as you go. After 3 misses (or `S` to give up) the country is marked red and the camera shows it. Countries already on the map can't be picked again. |

- Every click shows a small ✓ or ✗ pill with the country name at the click point.
- At the end of a round, a **results screen** shows the score, your best, the XP earned, any level-up, newly found countries and achievements, and a list of every question (click one to fly there). Each mode keeps its own best score, and each continent has a separate one.
- Sound effects (correct, miss, round complete) can be muted with the speaker button.
- **Keyboard:** press `?` for the shortcut list (`Enter` next, `S` skip / give up, `1`–`4` answer in Name it, `M` change mode, `P` collection, `+`/`-` zoom, arrows rotate, `N` north up, `R` home).

## Progression

All progress lives in `localStorage` on the device; there is no account and nothing is sent to the server.

- **XP:** every point earns XP (Classic and Continent sprint 100, Daily challenge 150, Name it 80, Continent cleanup 40). A perfect round adds 500, and each newly found country adds 50.
- **Levels:** 10 levels. Level 2 needs 1,500 XP, then 5,000, 12,000, 25,000, 40,000, 60,000, 85,000, 115,000 and 150,000 for level 10.
- **Collection (`P`):** every country you have found, grouped by continent (click one to fly there), plus 9 achievements such as Perfect round, Clean sweep (every country in a Continent cleanup), 3-day streak and Six continents.
- **Streak:** the number of consecutive days you played the Daily challenge.
- Countries under 1,000 km² (Vatican, Monaco, Singapore…) are drawn and clickable, but never asked.

## Architecture

| Layer | Path | Notes |
| --- | --- | --- |
| Web app | `apps/earth-web` | Vite + React 19 + Tailwind 4 + CesiumJS. Globe rendering in `src/globe/`. Mode logic (`modes.ts`, `quiz.ts`, `name-it.ts`, `cleanup.ts`) and progression (`progression.ts`: XP, levels, found countries, achievements, daily seed) and point-in-country lookup in `src/game/` (pure, unit-tested). One React component per mode in `src/games/`. |
| Data | `apps/earth-web/public/data/countries.json` | Country polygons generated from the Worldly bot's `src/features/worldly/assets/countries.json`. |
| Backend | `src/features/earth` | Only serves the built SPA. |

Cesium draws the countries as one batched polygon primitive with per-country colors, plus one border polyline primitive. The globe has no imagery layer, so no tiles are downloaded. Clicks are resolved in the browser by ray-casting the clicked lon/lat against the country polygons.

Cesium's static assets (workers, widgets, third-party files) are copied to `dist/cesiumStatic/` at build time. `CESIUM_BASE_URL` points there.

## Country data

```bash
npm run data:countries --workspace=@mmps/earth-web
```

The script rebuilds `countries.json`. It:

- computes each country's area;
- drops territories that the source draws twice (French Guiana also appears inside France);
- cuts enclaves (San Marino, Vatican City, Monaco) out of the surrounding country as holes;
- finds each country's land neighbours: two countries are neighbours when their borders come within 0.01° of each other.

Clicks on any remaining border slivers go to the smaller country.

## Development

```bash
npm run dev:earth-web     # Vite on :5373 at /earth/
npm run build:earth-web
```
