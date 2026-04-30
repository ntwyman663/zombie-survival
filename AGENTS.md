# Agent Guide

## Project Overview

This project is a vanilla browser-based canvas FPS called **Haunt House: Dead Rounds**. It uses hand-written JavaScript, HTML, and CSS with no build step or package manager.

The game currently includes:

- A raycast-style first-person renderer on a 2D canvas.
- A generated haunted-house map with a shop area.
- Round-based zombie spawning and scaling.
- Weapon buying/equipping, reloads, ammo, points, and HUD state.
- Pointer lock mouse look with keyboard fallback.
- Simple procedural Web Audio effects.

## Running Locally

Use a local static server instead of opening `index.html` directly. Pointer lock is limited on `file://` URLs.

Recommended commands:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If that port is busy, use another port:

```sh
python3 -m http.server 8080
```

## Coding Conventions

- Keep the project dependency-free unless the user explicitly asks to add tooling.
- Prefer vanilla ES modules over globals for new code.
- Preserve gameplay behavior when doing architecture or cleanup work.
- Keep gameplay constants in `src/config.js` where practical.
- Keep rendering code separate from simulation code.
- Keep DOM/HUD work in `src/ui.js`.
- Keep input handling in `src/input.js`.
- Keep procedural audio in `src/audio.js`.
- Use ASCII in source files unless an existing file already needs non-ASCII text.
- Do not rewrite unrelated UI styling or rebalance gameplay as part of refactors.

## Verification Checklist

After gameplay, rendering, input, or module changes, verify in a browser through a local server:

- Start and restart flows work.
- Pointer lock works from `http://localhost`.
- `file://` still falls back to arrow-key turning.
- WASD movement, arrow turning, mouse look, shooting, reload, and weapon hotkeys work.
- Zombies spawn, chase, attack, take damage, die, and complete rounds.
- Shop opens near the shop area, closes, buys, and equips weapons.
- HUD health, ammo/reload, points, zombies, messages, and round state update.
- Minimap, weapon view, sprites, damage vignette, and game-over overlay render.
- Browser console has no errors.

## Near-Term Roadmap

1. Foundation/docs/module split.
2. Pause/settings overlay with mouse sensitivity, volume, and minimap toggle.
3. More wave variety: special zombies, spawn warnings, and clearer inter-round downtime.
4. Progression systems: weapon upgrades, perks, and stronger point sinks.
5. Map authoring support once the core modules are stable.
