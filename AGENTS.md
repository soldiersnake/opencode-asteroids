# AGENTS.md

## Structure

- Vanilla ES6+ Asteroids clone. All game logic lives in the single file `game.js`; `index.html` only hosts the canvas and loads it.
- No `package.json`, no dependencies, no bundler, no CI. There are **no build/lint/typecheck/test commands** — do not look for them.

## Run / verify

- `npx serve .` → http://localhost:3000, or open `index.html` directly in the browser.
- Verification is manual only: after changes, exercise movement, shooting, asteroid splitting, respawn invincibility, and game over → restart with Space.

## Gotchas

- Canvas size is hardcoded in **two places**: `index.html` (`width="800" height="600"`) and `game.js` (`W`/`H` constants). Keep them in sync when changing dimensions.
- Space is toroidal: every moving entity must apply `wrap()` to x/y or it exits the field.
- Input: continuous keys read `keys[code]`; one-shot actions use the `pressed(code)` helper. Codes are `KeyboardEvent.code` values (`Space`, `ArrowUp`, …) and are `preventDefault`ed in the keydown listener.
- Game flow is a state machine (`state` ∈ `'playing' | 'dead' | 'gameover'`); new features must behave correctly in each state inside `update()`.
- `dt` in `loop()` is clamped to 0.05 s to prevent tunneling after tab switches — preserve that clamp.

## Conventions

- Comments, HUD strings, and README are in Spanish (`NIVEL`, `PUNTAJE`). Match it.
- Keep everything in `game.js` with `'use strict'` and the `// ── Section ──…` banner style; don't add dependencies or split files unless asked.
