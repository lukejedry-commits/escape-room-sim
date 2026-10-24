# The Oathbound Keep

Gothic castle escape-room graybox (v1 scaffold) for **Escape Room Simulator**. Single-player first-person.

Puzzle content is intentionally absent here — it comes from design. This repo is the playable shell: hall geometry, click-to-inspect (orbit), inventory hotbar, stage candles, soft session timer, and pause.

## Stack

- Vite + three.js
- `base: './'` so a later static deploy (e.g. GitHub Pages) can host from a project subpath

## Run

```bash
npm i && npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

```bash
npm run build              # output in dist/
npm test                   # timer, gates, chapter HUD, tab-away, overtime flame
npm run capture:graybox    # writes docs/screenshot_graybox.png (needs Chrome)
```

## Controls

| Input | Action |
| --- | --- |
| Click | Enter pointer lock / inspect or pick up look target |
| Drag (inspect) | Orbit the inspected prop |
| Esc | Close inspect, or pause / resume (freezes timer and sim) |
| WASD | Move |
| Mouse | Look (pointer lock) |
| 1–5 | Select hotbar slot |

Touch is not required for the v1 scaffold.

## Chapter HUD rule

Candles / gates `0–3` map 1:1 to story-locked titles:

| Gate | Title |
| --- | --- |
| 0 | The Threshold |
| 1 | The Silent Chapel |
| 2 | The Reliquary |
| 3 | The Open Door |

**Display rule:** the HUD shows the **next** chapter only — `Next · <title>` for the first uncleared gate. Examples: at start → `Next · The Threshold`; after `clearGate(0)` → `Next · The Silent Chapel`. When all four gates are cleared, it shows `Next · Escape`. On change, the cue fades in over ~1.5s (`#d8c8b0` at ~70% opacity, top-center). No progress bar, no puzzle counts.

Stub for testing: `clearGate(i)` on `window`.

## Inspect

Click-to-inspect opens an orbit view: black void backdrop, soft key `#ffb060` @ ~0.9 (upper-left), cool fill `#8aa8c8` @ ~0.25 (opposite), no fog. Metal roughness is preserved for engravings. Inspect freezes the soft timer; Esc closes.

## Pause / tab-away

Esc pauses through `setPaused`. Tab hide (`visibilitychange`) and window `blur` use the same path so the soft timer cannot run while the tab is away. Resume clears catch-up (discards the wall-clock gap; no physics catch-up).

## Graybox notes

- Limestone walls `#c4b8a4`, slate floor `#4a4e55`, bronze lock `#6b4a2e`
- Placeholder key: iron `#3a3d42`, metalness ~0.9, roughness ~0.7
- Candles: body `#2a2218`, wax `#e8dcc8`; lit flame emissive `#ffb060` with point light intensity `1.0` only when that gate is cleared. Overtime shifts flame to `#ff9a40` past 1:00, then `#ff6a4a` after ~10 more minutes overtime.
- Lighting: FogExp2 density `0.02`, cool moonlight `#8aa8c8` @ 0.3, Hemisphere `#2a3040` / `#1a1410` @ 0.35
- Soft 1-hour timer freezes on pause and examine; after 1h you keep playing and an overtime penalty counter increments (placeholder: +1 per 30s overtime). The timer never drives physics catch-up.
- **Wall colliders:** not in this polish — box clamp is enough for the graybox. Add real colliders before the first authored room mesh.

Graybox still (one candle lit): `docs/screenshot_graybox.png`.

## License

Private to the author unless stated otherwise.
