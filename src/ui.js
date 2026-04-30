import { clamp, weapons } from "./config.js";

export function createUi() {
  const weaponSheet = new Image();
  const weaponThumbs = new Map();
  weaponSheet.addEventListener("load", () => {
    weaponThumbs.clear();
    if (currentGame) renderShop(currentGame);
  });
  weaponSheet.src = "assets/weapons/weapon-sheet.png";
  let currentGame = null;

  const ui = {
    healthText: document.getElementById("healthText"),
    healthFill: document.getElementById("healthFill"),
    ammoText: document.getElementById("ammoText"),
    reloadFill: document.getElementById("reloadFill"),
    roundText: document.getElementById("roundText"),
    messageText: document.getElementById("messageText"),
    pointsText: document.getElementById("pointsText"),
    zombieText: document.getElementById("zombieText"),
    shopHint: document.getElementById("shopHint"),
    menuOverlay: document.getElementById("menuOverlay"),
    shopOverlay: document.getElementById("shopOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    gameOverStats: document.getElementById("gameOverStats"),
    startButton: document.getElementById("startButton"),
    restartButton: document.getElementById("restartButton"),
    closeShopButton: document.getElementById("closeShopButton"),
    weaponList: document.getElementById("weaponList"),
    damageVignette: document.getElementById("damageVignette"),
  };

  function renderShop(game) {
    currentGame = game;
    ui.weaponList.innerHTML = "";
    weapons.forEach((weapon, index) => {
      const owned = game.state.owned.has(weapon.id);
      const current = game.state.weaponIndex === index;
      const row = document.createElement("article");
      row.className = `weapon-row${current ? " current" : ""}`;

      const info = document.createElement("div");
      const thumb = renderWeaponThumb(weapon, owned);
      thumb.setAttribute("aria-hidden", "true");
      const title = document.createElement("h3");
      title.textContent = weapon.name;
      const profile = document.createElement("p");
      profile.textContent = `${weapon.profile}. Damage ${weapon.damage}, mag ${weapon.mag}, reserve ${weapon.reserve}, cost ${weapon.cost}.`;
      info.append(title, profile);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = current ? "Equipped" : owned ? "Equip" : `Buy ${weapon.cost}`;
      button.disabled = current || (!owned && game.state.points < weapon.cost);
      button.addEventListener("click", () => game.buyOrEquipWeapon(weapon.id));
      row.append(thumb, info, button);
      ui.weaponList.append(row);
    });
  }

  function renderWeaponThumb(weapon, owned) {
    const thumb = document.createElement("div");
    thumb.className = `weapon-thumb ${weapon.id}${owned ? "" : " locked"}`;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 72;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.fillStyle = "rgba(7, 7, 6, 0.36)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const thumbImage = weaponThumb(weapon);
    if (thumbImage) {
      const scale = Math.min(canvas.width / thumbImage.width, canvas.height / thumbImage.height) * 1.18;
      const width = thumbImage.width * scale;
      const height = thumbImage.height * scale;
      context.drawImage(thumbImage, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    } else {
      drawFallbackThumb(context, weapon, canvas.width, canvas.height);
    }

    thumb.append(canvas);
    return thumb;
  }

  function weaponThumb(weapon) {
    if (weaponThumbs.has(weapon.id)) return weaponThumbs.get(weapon.id);
    if (!weaponSheet.complete || !weaponSheet.naturalWidth) return null;

    const cols = 3;
    const rows = 2;
    const cellW = weaponSheet.naturalWidth / cols;
    const cellH = weaponSheet.naturalHeight / rows;
    const cell = weapon.artCell ?? 0;
    const source = document.createElement("canvas");
    source.width = cellW;
    source.height = cellH;
    const sourceCtx = source.getContext("2d");
    sourceCtx.imageSmoothingEnabled = false;
    sourceCtx.drawImage(
      weaponSheet,
      (cell % cols) * cellW,
      Math.floor(cell / cols) * cellH,
      cellW,
      cellH,
      0,
      0,
      cellW,
      cellH,
    );
    const imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
    let minX = source.width;
    let minY = source.height;
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      if (g > 180 && r < 90 && b < 90) {
        imageData.data[i + 3] = 0;
      } else if (imageData.data[i + 3] > 0) {
        const pixel = i / 4;
        const x = pixel % source.width;
        const y = Math.floor(pixel / source.width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    sourceCtx.putImageData(imageData, 0, 0);

    if (minX > maxX || minY > maxY) return null;

    const padding = 10;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = Math.min(source.width - cropX, maxX - minX + padding * 2);
    const cropH = Math.min(source.height - cropY, maxY - minY + padding * 2);
    const thumb = document.createElement("canvas");
    thumb.width = cropW;
    thumb.height = cropH;
    const thumbCtx = thumb.getContext("2d");
    thumbCtx.imageSmoothingEnabled = false;
    thumbCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    weaponThumbs.set(weapon.id, thumb);
    return thumb;
  }

  function drawFallbackThumb(context, weapon, width, height) {
    context.fillStyle = "#242827";
    context.fillRect(width * 0.18, height * 0.42, width * 0.56, height * 0.18);
    context.fillStyle = "#8b5b3b";
    context.fillRect(width * 0.28, height * 0.56, width * 0.16, height * 0.32);
    context.fillStyle = "#c28f3b";
    if (weapon.id === "rocket") context.fillRect(width * 0.62, height * 0.34, width * 0.18, height * 0.28);
    if (weapon.id === "shotgun" || weapon.id === "rifle") context.fillRect(width * 0.12, height * 0.48, width * 0.76, height * 0.1);
    if (weapon.id === "smg") context.fillRect(width * 0.42, height * 0.58, width * 0.12, height * 0.3);
  }

  function updateHud(game) {
    const weapon = game.currentWeapon();
    ui.healthText.textContent = `Health ${Math.ceil(game.player.health)}`;
    ui.healthFill.style.width = `${clamp(game.player.health / game.player.maxHealth * 100, 0, 100)}%`;
    ui.pointsText.textContent = `Points ${game.state.points}`;
    ui.zombieText.textContent = `Zombies ${game.zombies.length}`;
    ui.roundText.textContent = `Round ${game.state.round}`;
    ui.messageText.textContent = game.state.message;

    const ammo = game.state.ammo[weapon.id];
    const reloadPct =
      game.state.reloading > 0 ? (weapon.reload - game.state.reloading) / weapon.reload : ammo.mag / weapon.mag;
    ui.ammoText.textContent =
      game.state.reloading > 0 ? `${weapon.name} reloading` : `${weapon.name} ${ammo.mag}/${ammo.reserve}`;
    ui.reloadFill.style.width = `${clamp(reloadPct * 100, 0, 100)}%`;
    ui.shopHint.classList.toggle("visible", game.state.mode === "playing" && game.nearShop);
  }

  return { ...ui, renderShop, updateHud };
}
