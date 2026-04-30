# Haunt House: Dead Rounds

A vanilla JavaScript haunted-house zombie FPS prototype rendered on a 2D canvas.

## Current Features

- First-person raycast-style rendering.
- Round-based zombie survival.
- Pistol, shotgun, SMG, rifle, and hand cannon.
- Points, weapon shop, reloads, health, ammo, minimap, and game-over flow.
- Pointer lock mouse look with keyboard fallback.
- Procedural sound effects through Web Audio.

## Run Locally

Use a local static server so pointer lock can work:

```sh
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Controls

- `WASD`: Move
- `Mouse`: Look
- `Arrow Left` / `Arrow Right`: Turn fallback
- `Click`: Shoot
- `R`: Reload
- `E`: Open shop when nearby
- `1`-`5`: Equip owned weapons
- `Shift`: Sprint
- `Enter`: Start or restart
- `Escape`: Close shop

## Project Structure

- `index.html`: Canvas and overlay markup.
- `style.css`: HUD, overlays, and responsive styling.
- `src/main.js`: Bootstraps the game loop and connects systems.
- `src/config.js`: Constants, weapons, map dimensions, spawn points, decor, and helpers.
- `src/map.js`: Map construction, tile checks, movement collision, and ray casting.
- `src/state.js`: Player/run state creation and reset helpers.
- `src/ui.js`: HUD, shop, overlays, and DOM updates.
- `src/audio.js`: Procedural audio effects.
- `src/input.js`: Keyboard, mouse, pointer lock, and button wiring.
- `src/simulation.js`: Rounds, player movement, weapons, zombies, particles, and game state transitions.
- `src/renderer.js`: World, sprite, weapon, minimap, and screen-effect rendering.

## Near-Term Roadmap

1. Pause/settings overlay with mouse sensitivity, volume, and minimap toggle.
2. Special zombies and more wave pacing variety.
3. Weapon upgrades and perks.
4. Map authoring support or a small map editor.
