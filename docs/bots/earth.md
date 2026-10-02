# Earth — Find the Country

Earth is a public geography quiz on a 3D globe. It is built with React and CesiumJS, and Express serves it at `/earth/*`. It needs no login, no database and no API keys.

## How it plays

The globe is a plain political map: blue ocean, every country a white surface with grey borders and no names. Spin and zoom it, then click the country you are asked for. Clicking water or space only shows a hint and is not counted as a guess.

The app is themed as an airport. The start screen is a split-flap **departures board**: each mode is a flight with a gate number. Pick one (press `M` or the close button to come back to the board):

| Mode | Rules |
| --- | --- |
| **Today's flight** (gate D0) | 10 countries, the same for everyone on a given day. It can be flown once per day; the row shows your result until tomorrow. |
| **Classic** | 10 countries from anywhere on Earth, one try each. Correct: the country turns green and the next question follows. Wrong or skipped: your pick turns red, the right country turns green and the camera flies to it. |
| **Time Attack** | Find as many countries as you can in 60 seconds. Each miss or skip costs 3 seconds. The pick flashes red, the answer flashes green, and the next question follows right away. |
| **Continent Sprint** | Classic rules, limited to one continent (Africa, Asia, Europe, North America, South America or Oceania). The camera starts over that continent. A round has up to 10 questions; Oceania has 7. |
| **Neighbours** | One country is highlighted in yellow. Click every country that borders it (found ones turn green). You can make up to 3 wrong clicks per question; when they run out, or when you press `S` to give up, the missed neighbours are shown in light green. A round has 5 questions, and each neighbour found is worth 1 point. Only countries with at least 2 neighbours are asked. |

- Every click drops a passport stamp at the click point: "Admitted" for a hit, "Gate change" for a miss. Each correct answer draws a flight arc from the previous correct country.
- At the end of a round, a **boarding pass** shows the score, the miles earned, your tier, new stamps and achievements, and an itinerary of every question (click one to fly there). Each mode keeps its own best score, and each continent has a separate one.
- Sound effects (split-flap clicks, stamps, chime) can be muted with the speaker button.
- **Keyboard:** press `?` for the shortcut list (`Enter` next, `S` skip / give up, `M` change mode, `P` passport, `+`/`-` zoom, arrows rotate, `N` north up, `R` home).

## Progression

All progress lives in `localStorage` on the device; there is no account and nothing is sent to the server.

- **Miles:** every point earns miles (Classic and Continent 100, Today's flight 150, Time Attack 80, Neighbours 60). A perfect round adds 500, and each new passport stamp adds 50.
- **Tiers:** Economy → Premium (1,500 mi) → Business (5,000) → First (12,000) → Captain (25,000).
- **Passport (`P`):** one stamp for every country you have found, grouped by continent (click one to fly there), plus 10 achievements such as Perfect landing, Commuter (3-day daily streak) and Six continents.
- **Streak:** the number of consecutive days you flew Today's flight.
- Countries under 1,000 km² (Vatican, Monaco, Singapore…) are drawn and clickable, but never asked.

## Architecture

| Layer | Path | Notes |
| --- | --- | --- |
| Web app | `apps/earth-web` | Vite + React 19 + Tailwind 4 + CesiumJS. Globe rendering in `src/globe/`. Mode logic (`modes.ts`, `quiz.ts`, `time-attack.ts`, `neighbours.ts`) and progression (`progression.ts`: miles, tiers, stamps, achievements, daily seed) and point-in-country lookup in `src/game/` (pure, unit-tested). One React component per mode in `src/games/`. |
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
