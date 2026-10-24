# Escape Room Simulator

Gothic castle escape-room graybox (v1 scaffold). Single-player first-person.

Puzzle content is intentionally absent here — it comes from design. This repo is the playable shell: hall geometry, click-to-inspect, inventory hotbar, stage candles, soft session timer, and pause.

## Stack

- Vite + three.js
- `base: './'` so a later static deploy (e.g. GitHub Pages) can host from a project subpath

## Run

```bash
npm i && npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

```bash
npm run build    # output in dist/
npm test         # timer freeze, gate→candle, overtime penalty
```

## Controls

| Input | Action |
| --- | --- |
| Click | Enter pointer lock / inspect or pick up look target |
| WASD | Move |
| Mouse | Look (pointer lock) |
| Esc | Pause / resume (freezes timer and sim) |
| 1–5 | Select hotbar slot |

Touch is not required for the v1 scaffold.

## Graybox notes

- Limestone walls `#c4b8a4`, slate floor `#4a4e55`, bronze lock `#6b4a2e`
- Four stage candles stay unlit until `clearGate(i)` (stub on `window` for testing)
- Soft 1-hour timer freezes on pause and examine; after 1h you keep playing and an overtime penalty counter increments (placeholder: +1 per 30s overtime). The timer never drives physics catch-up.
- HUD shows a chapter cue (`Chapter 1 · Hall`), not a progress bar

## License

Private to the author unless stated otherwise.
