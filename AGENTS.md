# Agent Guide

## Project Overview

This project is a vanilla browser-based canvas FPS called **Haunted House: Survival**. It uses hand-written JavaScript, HTML, and CSS with no build step or package manager.

The game currently includes:

- A raycast-style first-person renderer on a 2D canvas.
- A generated haunted-house map with a shop area.
- Round-based zombie spawning and scaling.
- Zombie A* pathfinding, doorway navigation, crowding, and multiple zombie types.
- Weapon buying/equipping, shop proximity prompt, locked weapon thumbnails, reloads, magazine/reserve ammo, ammo drops, points, and HUD state.
- Hitscan weapons plus a rocket launcher with projectile and splash explosion behavior.
- Pointer lock mouse look with keyboard fallback.
- Procedural Web Audio sound effects and background chiptune music.
- Pixel-art weapon, zombie, and environment texture assets in `assets/`.

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
- Keep A* and tile-level map helpers in `src/map.js`.
- Keep projectile, explosion, zombie, ammo-drop, and round behavior in `src/simulation.js`.
- Keep generated project assets under `assets/`; do not reference files from `$CODEX_HOME/generated_images`.
- Use ASCII in source files unless an existing file already needs non-ASCII text.
- Do not rewrite unrelated UI styling or rebalance gameplay as part of refactors.

## Verification Checklist

After gameplay, rendering, input, or module changes, verify in a browser through a local server:

- Start and restart flows work.
- Pointer lock works from `http://localhost`.
- `file://` still falls back to arrow-key turning.
- WASD movement, arrow turning, mouse look, shooting, reload, and weapon hotkeys work.
- Zombies spawn, path through doorways, crowd without stacking, attack, take damage, die, and complete rounds.
- Runner/brute/stalker variants appear in later rounds and remain visually readable.
- SMG hold-to-fire works while single-shot weapons still click once.
- Rocket projectile impacts walls/zombies and applies splash damage.
- Ammo pickups add reserve ammo and reload consumes reserve ammo.
- Shop proximity prompt appears near the crosshair; shop opens near the shop area, closes, buys, and equips weapons.
- Unowned shop weapon thumbnails stay dimmed/locked, and owned thumbnails show the pixel weapon art.
- HUD health, ammo/reload, points, zombies, messages, and round state update.
- Player-forward minimap, weapon view, sprites, damage vignette, and game-over overlay render.
- Pixel-art weapon and zombie sheets load; canvas fallbacks remain usable if an asset fails.
- `debug-zombies.html` can be used to inspect or tune zombie sprite crop rectangles.
- Browser console has no errors.

## Near-Term Roadmap

1. Pause/settings overlay with mouse sensitivity, music/effects volume, and minimap toggle.
2. Progression systems: weapon upgrades, perks, and stronger point sinks.
3. More authored map variety and encounter pacing.
4. Map authoring support once the core modules are stable.
