# Earth

Earth is a public 3D globe in the style of Google Earth. It is built with React and CesiumJS on Google Photorealistic 3D Tiles. Express serves it at `/earth/*`. It needs no login and no database.

## Features

- **Globe navigation:** drag to rotate the globe, scroll or right-drag to zoom, and Ctrl/Shift-drag or middle-drag to tilt and rotate. There are compass, tilt (2D/3D), zoom and "my location" controls. Double-click zooms toward a point. As in Google Earth, the view flattens toward straight-down as you zoom out (full tilt below ~400 km, none above ~6,000 km), so the whole globe ends up centered.
- **Map styles:** 3D (photorealistic cities and terrain), Satellite, Hybrid and Map. Toggles for country names, city names, borders, lat/long gridlines, atmosphere and day/night sunlight.
- **Search:** Google Places autocomplete, biased to the current view. Accepts coordinates (`48.858, 2.294`). Clicking a result flies the camera there and shows an info card.
- **Voyager:** guided tours (Wonders of the World, Great Cities, Natural Marvels, Around the Mediterranean) and single places. Tours have previous/next/stop controls. "I'm feeling lucky" flies to a random landmark.
- **Tools:** distance and area measuring, saved places (stored in this browser) with KML/GeoJSON export, KML/KMZ/GeoJSON import by file picker or drag-and-drop, PNG screenshots, and shareable links.
- **Shareable views:** the URL hash stores the camera as `#@lat,lon,{altitude}a,{heading}h,{tilt}t`. Opening the link restores the view.
- **Keyboard:** press `?` for the shortcut list.

## Architecture

| Layer | Path | Notes |
| --- | --- | --- |
| Web app | `apps/earth-web` | Vite + React 19 + Tailwind 4 + CesiumJS. Globe engine in `src/globe/`, tools in `src/tools/`, tours in `src/voyager/`. |
| Backend | `src/features/earth` | Serves the built SPA and `GET /api/earth/config`. |
| Storage | browser | Settings and saved places in `localStorage`; imported files in IndexedDB. |

Cesium's static assets (workers, widgets, third-party files) are copied to `dist/cesiumStatic/` at build time. `CESIUM_BASE_URL` points there.

## Configuration

`GET /api/earth/config` returns the browser key from `EARTH_GOOGLE_MAPS_BROWSER_KEY`, falling back to `GOOGLE_MAPS_API_KEY`. The key is sent to the browser, so in Google Cloud:

1. Enable the **Map Tiles API** and **Places API (New)**.
2. Restrict the key by **HTTP referrer** to your production domain and `localhost`.
3. Restrict the key to those two APIs and set quotas plus a budget alert.

## Development

```bash
npm run dev:earth-web     # Vite on :5373, proxies /api/earth to the backend
npm run build:earth-web
```

Set `EARTH_API_TARGET` to point the Vite proxy at a backend other than `http://localhost:3000`.
