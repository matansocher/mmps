# Earth — design system

The theme is **Departures**: the quiz plays out as air travel. See `PRODUCT.md` for who the game is for, and the comment in `index.html` for the direction contract.

## Tokens (`src/index.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#0a1115` | Page and splash background, text on signage |
| `--color-board` / `--color-tile` | `#0f181c` / `#1c262b` | Panels, flap tiles |
| `--color-signage` | `#ffc72c` | Primary actions, flap letters, the clock. Use it sparingly: it marks the next thing to do |
| `--color-paper` | `#f4ecd8` | Land on the globe, the boarding pass, the passport |
| `--color-ok` / `--color-bad` | `#4fd08f` / `#ff6b57` | Hit / miss: country fills, stamps, leg squares |
| `--color-passport` | `#5b1e2a` | Passport header only |
| `--font-board` | Barlow Condensed | Signage: titles, gates, statuses, numbers (tabular) |
| `--font-sans` | Atkinson Hyperlegible | Body copy and country names in lists |

## Components

- **SplitFlap**: board text that scrambles into place. The final text is in `aria-label`; motion is skipped under `prefers-reduced-motion`.
- **DeparturesBoard**: the home screen. A left panel on desktop and a bottom sheet (64dvh) on phones; on phones the globe is lifted (`.globe-lifted`) into the space above it.
- **GameCard**: the in-round HUD at the top centre. **QuizCard / TargetBoard** shows the leg squares and the country to find.
- **Stamps**: the rotated stamp placed at the click point; "Admitted" (green) or "Gate change" (red). They fade out after 1.5 s.
- **RoundSummary**: the boarding pass. A paper card with a perforation, a count-up of miles, the tier bar and the itinerary.
- **Passport**: a dialog with achievements and stamps grouped by continent.

## Rules

- Panels are solid, not glass. There are no gradient text, eyebrow labels or decorative blur.
- Reward motion (flaps, stamps, arcs, count-up) is always short and is skipped under reduced motion.
- Every sound has a visual equivalent, and sound can be muted.
