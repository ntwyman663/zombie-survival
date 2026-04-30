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

  function handleKeyPress(code) {
    if (code === "Enter" && (game.state.mode === "menu" || game.state.mode === "gameover")) {
      startOrRestart();
      return;
    }

    if (code === "Escape" && game.state.mode === "shop") {
      game.closeShop();
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
    const captured = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
      "KeyR",
      "KeyE",
      "Enter",
    ];
    if (captured.includes(event.code) || event.code.startsWith("Digit")) event.preventDefault();
    game.keys.add(event.code);
    if (!event.repeat) handleKeyPress(event.code);
  });

  window.addEventListener("keyup", (event) => {
    game.keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    game.keys = new Set();
    game.isFiring = false;
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas && game.state.mode === "playing") {
      game.player.angle += event.movementX * 0.00225;
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
  ui.closeShopButton.addEventListener("click", game.closeShop);
}
