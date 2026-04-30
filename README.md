# Haunted House: Survival

A vanilla JavaScript haunted-house zombie FPS prototype rendered on a 2D canvas.

## Current Features

- First-person raycast-style rendering.
- Round-based zombie survival with scaling enemy counts.
- A* zombie pathfinding through doorways, local crowding, and varied path offsets.
- Multiple zombie types: walker, runner, brute, and stalker.
- Pistol, shotgun, SMG, rifle, hand cannon, and rocket launcher.
- Rocket projectiles with splash explosions.
- Points, weapon shop, magazine/reserve ammo, reloads, health, minimap, and game-over flow.
- Zombie ammo drops that refill reserve ammo for the equipped weapon.
- Pointer lock mouse look with keyboard fallback.
- Procedural sound effects and bit-style background music through Web Audio.
- Pixel-art weapon, zombie, and wall texture sheets.

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
- Hold `Click`: Continuous fire for automatic weapons such as the SMG
- `R`: Reload
- `E`: Open shop when nearby
- `1`-`6`: Equip owned weapons
- `Shift`: Sprint
- `Enter`: Start or restart
- `Escape`: Close shop

## Project Structure

- `index.html`: Canvas and overlay markup.
- `style.css`: HUD, overlays, and responsive styling.
- `src/main.js`: Bootstraps the game loop and connects systems.
- `src/config.js`: Constants, weapons, map dimensions, spawn points, decor, and helpers.
- `src/map.js`: Map construction, tile checks, movement collision, and ray casting.
- `src/map.js`: Also owns walkable-tile lookup and A* pathfinding helpers.
- `src/state.js`: Player/run state creation and reset helpers.
- `src/ui.js`: HUD, shop, overlays, and DOM updates.
- `src/audio.js`: Procedural audio effects.
- `src/input.js`: Keyboard, mouse, pointer lock, and button wiring.
- `src/simulation.js`: Rounds, player movement, weapons, projectiles, explosions, zombies, particles, and game state transitions.
- `src/renderer.js`: World, sprite, weapon, minimap, and screen-effect rendering.
- `assets/`: Pixel-art weapon, environment, and zombie sheets used by the renderer.
- `debug-zombies.html`: Local helper for visually selecting zombie sprite crop rectangles.

## Near-Term Roadmap

1. Pause/settings overlay with mouse sensitivity, volume, music volume, and minimap toggle.
2. Weapon upgrades and perks.
3. More map variety and authored encounters.
4. Map authoring support or a small map editor.
