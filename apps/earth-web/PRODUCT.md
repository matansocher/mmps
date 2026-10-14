# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone on the public web, on desktop and mobile equally. They arrive with a few minutes to spare and want a quick, satisfying geography challenge they can replay and get better at.

## Product Purpose

"Find the Country" is a geography quiz played on a real 3D globe. The player is given a country name and must spin, zoom and tap the right shape on an unlabeled political map. Success means players finish rounds, feel themselves improving, and come back on following days.

## Positioning

Most geography quizzes use flat maps or multiple choice. Here the player physically explores a rotatable globe with no labels, so recall is spatial and earned, not guessed from four options.

## Operating Context

- Served at `/earth/` by the MMPS Express server; no login, no account.
- Played with mouse/trackpad on desktop and touch on phones; keyboard shortcuts exist for desktop.
- Sessions are short (one round of 1–2 minutes), often repeated.

## Capabilities and Constraints

- Modes: Today's flight (the same 10 countries for everyone, once per day), Classic (10 countries anywhere), Continent Sprint (Classic limited to one continent), Name it (pick the highlighted country's name from 4 nearby options), Continent cleanup (find every country on one continent).
- Countries are never labeled on the map; that is the core challenge. Countries under 1,000 km² are drawn but never asked.
- No backend and no database: all progress lives in `localStorage` on the device.
- In scope for retention: a daily challenge, streaks, XP/levels and achievements, all local-only.
- Out of scope: accounts, server leaderboards, ads, paid features.
- Rendering is CesiumJS with no imagery tiles and no Google APIs; country shapes come from `public/data/countries.json`.

## Brand Commitments

- Name: "Find the Country".
- Countries stay unlabeled on the globe. The globe style (colors, atmosphere, lighting) may change.

## Evidence on Hand

- Real data: 190+ country polygons with area, continent and land neighbours.
- No testimonials, player counts or press exist; do not fabricate any.

## Product Principles

1. The globe is the game; UI must never block the part of the map the player needs.
2. Every guess gets immediate, unmistakable feedback.
3. Progress should be visible after every round, so one more round always feels worth it.
4. Equal quality on a phone held in one hand and on a desktop with a mouse.

## Accessibility & Inclusion

- Right/wrong feedback must not rely on color alone (icons/text alongside red/green).
- Respect `prefers-reduced-motion`; sound must be optional and off-able.
