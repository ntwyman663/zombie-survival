import { createAudioSystem } from "./audio.js";
import { bindInput } from "./input.js";
import { buildMap, createMapSystem } from "./map.js";
import { createRenderer } from "./renderer.js";
import { createSimulation } from "./simulation.js";
import { createUi } from "./ui.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const ui = createUi();
const audio = createAudioSystem();
const mapSystem = createMapSystem(buildMap());
const game = createSimulation({ canvas, ui, mapSystem, audio });
const renderer = createRenderer({ canvas, ctx, mapSystem, game });

bindInput({ canvas, ui, game, audio });

let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  game.update(dt);
  renderer.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
