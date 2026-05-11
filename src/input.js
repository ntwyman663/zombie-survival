import { PITCH_LIMIT, clamp } from "./config.js";

export function bindInput({ canvas, ui, game, audio }) {
  function requestGamePointerLock(shootOnFail = false) {
    if (window.location.protocol === "file:") {
      game.pointerLockBlocked = true;
      game.setMessage("Mouse lock unavailable. Arrow keys turn.", 2.8);
      if (shootOnFail) game.shoot();
      return;
    }

    if (game.pointerLockBlocked || !canvas.requestPointerLock) {
      if (shootOnFail) game.shoot();
      return;
    }

    try {
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          game.pointerLockBlocked = true;
          game.setMessage("Mouse lock unavailable. Arrow keys turn.", 2.8);
          if (shootOnFail) game.shoot();
        });
      }
    } catch (error) {
      game.pointerLockBlocked = true;
      game.setMessage("Mouse lock unavailable. Arrow keys turn.", 2.8);
      if (shootOnFail) game.shoot();
    }
  }

  function startOrRestart() {
    audio.ensureAudio();
    audio.startMusic();
    game.initializeRun();
    requestGamePointerLock();
  }

  function resumeFromPause() {
    audio.ensureAudio();
    game.resumeGame();
    requestGamePointerLock();
  }

  function closeShopAndResume() {
    game.closeShop();
    requestGamePointerLock();
  }

  function handleKeyPress(code) {
    if (code === "Enter" && (game.state.mode === "menu" || game.state.mode === "gameover")) {
      startOrRestart();
      return;
    }

    if (code === "Escape" && game.state.mode === "playing") {
      game.pauseGame();
      return;
    }

    if (code === "Escape" && game.state.mode === "paused") {
      resumeFromPause();
      return;
    }

    if (code === "Escape" && game.state.mode === "shop") {
      closeShopAndResume();
      return;
    }

    if (game.state.mode !== "playing") return;

    if (code === "KeyR") game.beginReload();
    if (code === "KeyE") game.openShop();

    if (code.startsWith("Digit")) {
      const index = Number(code.slice(5)) - 1;
      game.equipWeapon(index);
    }
  }

  window.addEventListener("keydown", (event) => {
    const held = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyQ",
      "KeyZ",
      "ShiftLeft",
      "ShiftRight",
    ];
    const captured = [
      ...held,
      "KeyR",
      "KeyE",
      "Enter",
      "Escape",
    ];
    if (captured.includes(event.code) || event.code.startsWith("Digit")) event.preventDefault();
    if (!event.repeat) handleKeyPress(event.code);
    if (game.state.mode === "playing" && held.includes(event.code)) game.keys.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    game.keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    game.keys = new Set();
    game.isFiring = false;
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) game.isFiring = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && game.state.mode === "playing") {
      game.player.angle += event.movementX * 0.00225 * game.settings.mouseSensitivity;
      game.player.pitch = clamp(
        game.player.pitch - event.movementY * 0.0018 * game.settings.mouseSensitivity,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    }
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || game.state.mode !== "playing") return;
    game.isFiring = true;
    audio.ensureAudio();
    if (document.pointerLockElement !== canvas) {
      requestGamePointerLock(true);
      return;
    }
    game.shoot();
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) game.isFiring = false;
  });

  canvas.addEventListener("click", () => {
    if (game.state.mode !== "playing") return;
    audio.ensureAudio();
    if (document.pointerLockElement !== canvas) {
      requestGamePointerLock(true);
      return;
    }
    if (!game.currentWeapon().automatic) game.shoot();
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  ui.startButton.addEventListener("click", startOrRestart);
  ui.restartButton.addEventListener("click", startOrRestart);
  ui.resumeButton.addEventListener("click", resumeFromPause);
  ui.quitButton.addEventListener("click", game.quitRun);
  ui.showControlsButton.addEventListener("click", () => ui.showPauseTab("controls"));
  ui.showSettingsButton.addEventListener("click", () => ui.showPauseTab("settings"));
  ui.sensitivityInput.addEventListener("input", () => {
    game.updateSettings({ mouseSensitivity: Number(ui.sensitivityInput.value) / 100 });
  });
  ui.musicVolumeInput.addEventListener("input", () => {
    game.updateSettings({ musicVolume: Number(ui.musicVolumeInput.value) / 100 });
  });
  ui.effectsVolumeInput.addEventListener("input", () => {
    game.updateSettings({ effectsVolume: Number(ui.effectsVolumeInput.value) / 100 });
  });
  ui.minimapToggle.addEventListener("change", () => {
    game.updateSettings({ showMinimap: ui.minimapToggle.checked });
  });
  ui.closeShopButton.addEventListener("click", closeShopAndResume);
}
