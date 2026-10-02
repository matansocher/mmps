# Earth — Find the Country

Earth is a public geography quiz on a 3D globe. It is built with React and CesiumJS, and Express serves it at `/earth/*`. It needs no login, no database and no API keys.

## How it plays

- The globe is a plain political map: blue ocean, every country a white surface with grey borders and no names.
- Each round asks for 10 countries. Spin and zoom the globe, then click the country you're asked for. You get one try per question.
- **Correct:** the country turns green and the next question follows automatically.
- **Wrong:** your pick turns red, the right country turns green and the camera flies to it. **Skip** works the same way.
- Clicking water or space only shows a hint and does not count as a guess.
- At the end of the round a summary lists every answer (click one to fly there) and your best score, which is kept in `localStorage`.
- Countries under 1,000 km² (Vatican, Monaco, Singapore…) are drawn and clickable, but never asked.
- **Keyboard:** press `?` for the shortcut list (`Enter` next, `S` skip, `+`/`-` zoom, arrows rotate, `N` north up, `R` home).

## Architecture

| Layer | Path | Notes |
| --- | --- | --- |
| Web app | `apps/earth-web` | Vite + React 19 + Tailwind 4 + CesiumJS. Globe rendering in `src/globe/`. Quiz logic and point-in-country lookup in `src/game/` (pure, unit-tested). |
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
- cuts enclaves (San Marino, Vatican City, Monaco) out of the surrounding country as holes.

Clicks on any remaining border slivers go to the smaller country.

## Development

```bash
npm run dev:earth-web     # Vite on :5373 at /earth/
npm run build:earth-web
```
