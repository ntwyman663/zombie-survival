import {
  COUNTER,
  FOV,
  MAP_W,
  TAU,
  angleDiff,
  clamp,
  decorSprites,
  fillRoundRect,
  shadeRgb,
} from "./config.js";

export function createRenderer({ canvas, ctx, mapSystem, game }) {
  let view = { w: 1, h: 1, dpr: 1 };
  const weaponSheet = new Image();
  let weaponSheetCanvas = null;
  weaponSheet.src = "assets/weapons/weapon-sheet.png";
  weaponSheet.addEventListener("load", () => {
    weaponSheetCanvas = document.createElement("canvas");
    weaponSheetCanvas.width = weaponSheet.naturalWidth;
    weaponSheetCanvas.height = weaponSheet.naturalHeight;
    const sheetCtx = weaponSheetCanvas.getContext("2d");
    sheetCtx.drawImage(weaponSheet, 0, 0);
    const imageData = sheetCtx.getImageData(0, 0, weaponSheetCanvas.width, weaponSheetCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      if (g > 170 && r < 95 && b < 95) imageData.data[i + 3] = 0;
    }
    sheetCtx.putImageData(imageData, 0, 0);
  });

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(window.innerWidth * dpr));
    const height = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      view = { w: width, h: height, dpr };
    }
  }

  function wallColor(hit, correctedDist) {
    let base = [116, 104, 84];
    if ((hit.mapX + hit.mapY) % 5 === 0) base = [105, 119, 90];
    if (hit.tile === COUNTER) base = [132, 78, 58];
    const stripe = Math.floor(hit.wallX * 10) % 2 === 0 ? 0.96 : 1.12;
    const side = hit.side === 1 ? 0.88 : 1.06;
    const fog = clamp(1.18 - correctedDist / 26, 0.38, 1);
    return shadeRgb(base, stripe * side * fog);
  }

  function renderWorld(depths) {
    const { w, h } = view;
    const horizon = h * 0.5 + Math.sin(game.player.bob) * game.state.screenKick * h * 0.01;

    const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
    ceiling.addColorStop(0, "#1f1c18");
    ceiling.addColorStop(1, "#4b4135");
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, w, horizon);

    const floor = ctx.createLinearGradient(0, horizon, 0, h);
    floor.addColorStop(0, "#5a4837");
    floor.addColorStop(1, "#211b17");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "#e0b66b";
    ctx.lineWidth = Math.max(1, view.dpr);
    for (let i = 0; i < 9; i += 1) {
      const y = horizon + (i / 9) * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + Math.sin(i + game.state.gameTime) * 4 * view.dpr);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const rays = Math.ceil(w / 2);
    const strip = w / rays + 1;
    depths.length = rays;

    for (let i = 0; i < rays; i += 1) {
      const cameraX = i / rays;
      const angle = game.player.angle - FOV / 2 + cameraX * FOV;
      const hit = mapSystem.castRay(game.player, angle);
      const corrected = Math.max(0.0001, hit.dist * Math.cos(angle - game.player.angle));
      const wallHeight = Math.min(h * 1.6, h / (corrected * 0.72));
      const x = i * (w / rays);
      const y = horizon - wallHeight * 0.5;
      depths[i] = corrected;

      ctx.fillStyle = wallColor(hit, corrected);
      ctx.fillRect(x, y, strip, wallHeight);

      if (Math.floor(hit.wallX * 18) === 0) {
        ctx.fillStyle = "rgba(15, 12, 10, 0.32)";
        ctx.fillRect(x, y, strip, wallHeight);
      }
    }
  }

  function projectWorldPoint(x, y, heightScale = 1) {
    const dx = x - game.player.x;
    const dy = y - game.player.y;
    const dist = Math.hypot(dx, dy);
    const rel = angleDiff(Math.atan2(dy, dx), game.player.angle);
    if (Math.abs(rel) > FOV * 0.68 || dist < 0.05) return null;

    const focal = view.w / 2 / Math.tan(FOV / 2);
    const screenX = view.w / 2 + Math.tan(rel) * focal;
    const size = view.h / (dist * 0.86) * heightScale;
    const bottom = view.h * 0.5 + size * 0.5;
    return { dist, rel, screenX, size, top: bottom - size, bottom };
  }

  function visibleByDepth(projected, depths) {
    const col = clamp(Math.floor(projected.screenX / view.w * depths.length), 0, depths.length - 1);
    return projected.dist < depths[col] + 0.12;
  }

  function renderSprites(depths) {
    const sprites = [];
    decorSprites.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, sprite.type === "shop" ? 0.72 : 0.46);
      if (projected && visibleByDepth(projected, depths)) sprites.push({ sprite, projected });
    });
    game.particles.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, 0.16);
      if (projected && visibleByDepth(projected, depths)) sprites.push({ sprite, projected });
    });
    game.ammoDrops.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, 0.28);
      if (projected && visibleByDepth(projected, depths)) sprites.push({ sprite, projected });
    });
    game.projectiles.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, 0.18);
      if (projected && visibleByDepth(projected, depths)) sprites.push({ sprite, projected });
    });
    game.explosions.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, sprite.radius);
      if (projected) sprites.push({ sprite, projected });
    });
    game.zombies.forEach((sprite) => {
      const projected = projectWorldPoint(sprite.x, sprite.y, 0.82);
      if (projected && visibleByDepth(projected, depths)) sprites.push({ sprite, projected });
    });

    sprites
      .sort((a, b) => b.projected.dist - a.projected.dist)
      .forEach(({ sprite, projected }) => {
        if (sprite.type === "candle") drawCandle(projected);
        else if (sprite.type === "shop") drawShopSign(projected);
        else if (sprite.type === "blood") drawBlood(projected, sprite);
        else if (sprite.type === "ammo") drawAmmoDrop(projected, sprite);
        else if (sprite.type === "rocket") drawRocket(projected);
        else if (sprite.type === "explosion") drawExplosion(projected, sprite);
        else drawZombie(projected, sprite);
      });
  }

  function drawCandle(projected) {
    const s = projected.size;
    const x = projected.screenX;
    const y = projected.bottom;
    ctx.save();
    ctx.globalAlpha = clamp(1.2 - projected.dist / 18, 0.48, 1);
    ctx.fillStyle = "rgba(237, 175, 72, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.45, s * 0.9, s * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#d6c7ad";
    fillRoundRect(ctx, x - s * 0.06, y - s * 0.5, s * 0.12, s * 0.45, s * 0.025);
    ctx.fillStyle = "#e89131";
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.72);
    ctx.quadraticCurveTo(x + s * 0.15, y - s * 0.52, x, y - s * 0.42);
    ctx.quadraticCurveTo(x - s * 0.13, y - s * 0.55, x, y - s * 0.72);
    ctx.fill();
    ctx.restore();
  }

  function drawShopSign(projected) {
    const s = projected.size;
    const x = projected.screenX;
    const y = projected.top + s * 0.2;
    ctx.save();
    ctx.globalAlpha = clamp(1.25 - projected.dist / 18, 0.56, 1);
    ctx.fillStyle = "rgba(41, 28, 14, 0.86)";
    fillRoundRect(ctx, x - s * 0.48, y, s * 0.96, s * 0.34, s * 0.04);
    ctx.strokeStyle = "#d49a32";
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.strokeRect(x - s * 0.43, y + s * 0.04, s * 0.86, s * 0.26);
    ctx.fillStyle = "#f3cf85";
    ctx.font = `900 ${Math.max(12, s * 0.18)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SHOP", x, y + s * 0.18);
    ctx.restore();
  }

  function drawBlood(projected, particle) {
    const alpha = clamp(particle.life * 2, 0, 0.7);
    const s = projected.size;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#9b1d24";
    ctx.beginPath();
    ctx.arc(projected.screenX, projected.top + s * 0.25, Math.max(2, s * 0.11), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawAmmoDrop(projected, drop) {
    const s = projected.size;
    const x = projected.screenX;
    const y = projected.bottom - s * 0.2 + Math.sin(drop.pulse) * s * 0.04;
    ctx.save();
    ctx.globalAlpha = clamp(1.2 - projected.dist / 20, 0.45, 1);
    ctx.fillStyle = "rgba(230, 184, 75, 0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y, s * 0.42, s * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#d9a93f";
    fillRoundRect(ctx, x - s * 0.22, y - s * 0.19, s * 0.44, s * 0.26, s * 0.05);
    ctx.fillStyle = "#4b3a22";
    fillRoundRect(ctx, x - s * 0.15, y - s * 0.11, s * 0.3, s * 0.08, s * 0.02);
    ctx.fillStyle = "#f4df91";
    ctx.fillRect(x - s * 0.04, y - s * 0.18, s * 0.08, s * 0.24);
    ctx.fillRect(x - s * 0.16, y - s * 0.1, s * 0.32, s * 0.07);
    ctx.restore();
  }

  function drawRocket(projected) {
    const s = projected.size;
    ctx.save();
    ctx.fillStyle = "#d6c07d";
    fillRoundRect(ctx, projected.screenX - s * 0.1, projected.top + s * 0.25, s * 0.2, s * 0.4, s * 0.05);
    ctx.fillStyle = "#d45132";
    ctx.beginPath();
    ctx.moveTo(projected.screenX, projected.top + s * 0.08);
    ctx.lineTo(projected.screenX - s * 0.1, projected.top + s * 0.28);
    ctx.lineTo(projected.screenX + s * 0.1, projected.top + s * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(241, 132, 46, 0.75)";
    ctx.beginPath();
    ctx.ellipse(projected.screenX, projected.top + s * 0.72, s * 0.14, s * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawExplosion(projected, explosion) {
    const progress = 1 - explosion.life / explosion.maxLife;
    const s = projected.size * (0.24 + progress * 0.8);
    ctx.save();
    ctx.globalAlpha = clamp(1 - progress, 0, 0.9);
    ctx.fillStyle = "#f5c15c";
    ctx.beginPath();
    ctx.arc(projected.screenX, projected.top + projected.size * 0.45, s * 0.34, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#d45132";
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.arc(projected.screenX, projected.top + projected.size * 0.45, s * 0.5, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = "#2f2c28";
    ctx.beginPath();
    ctx.arc(projected.screenX + s * 0.12, projected.top + projected.size * 0.37, s * 0.24, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawZombie(projected, zombie) {
    const s = projected.size;
    const x = projected.screenX;
    const top = projected.top;
    const bottom = projected.bottom;
    const width = s * 0.38;
    const shade = clamp(1.2 - projected.dist / 19, 0.46, 1);
    const sway = Math.sin(zombie.sway) * s * 0.035;
    const hit = zombie.hitFlash > 0;

    ctx.save();
    ctx.globalAlpha = shade;
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x, bottom, width * 0.85, s * 0.08, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = hit ? "#f5eddc" : zombie.type.head;
    ctx.beginPath();
    ctx.arc(x + sway, top + s * 0.2, s * 0.12, 0, TAU);
    ctx.fill();

    ctx.fillStyle = hit ? "#f5eddc" : zombie.type.body;
    fillRoundRect(ctx, x - width * 0.45 + sway, top + s * 0.3, width * 0.9, s * 0.36, s * 0.035);

    ctx.strokeStyle = hit ? "#e8dfc9" : "#5f6e45";
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.38 + sway, top + s * 0.36);
    ctx.lineTo(x - width * 0.74, top + s * 0.55);
    ctx.moveTo(x + width * 0.38 + sway, top + s * 0.37);
    ctx.lineTo(x + width * 0.72, top + s * 0.54);
    ctx.stroke();

    ctx.strokeStyle = "#3d3b32";
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.18 + sway, top + s * 0.65);
    ctx.lineTo(x - width * 0.26, bottom - s * 0.02);
    ctx.moveTo(x + width * 0.18 + sway, top + s * 0.65);
    ctx.lineTo(x + width * 0.28, bottom - s * 0.02);
    ctx.stroke();

    ctx.fillStyle = "#d92730";
    ctx.beginPath();
    ctx.arc(x - s * 0.038 + sway, top + s * 0.19, Math.max(1, s * 0.014), 0, TAU);
    ctx.arc(x + s * 0.038 + sway, top + s * 0.19, Math.max(1, s * 0.014), 0, TAU);
    ctx.fill();

    const barW = width * 1.05;
    const hp = clamp(zombie.health / zombie.maxHealth, 0, 1);
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
    ctx.fillRect(x - barW / 2, top + s * 0.04, barW, Math.max(3, s * 0.025));
    ctx.fillStyle = "#bf3035";
    ctx.fillRect(x - barW / 2, top + s * 0.04, barW * hp, Math.max(3, s * 0.025));
    ctx.restore();
  }

  function drawWeaponView() {
    const { w, h } = view;
    const weapon = game.currentWeapon();
    const bob = Math.sin(game.player.bob) * 8 * view.dpr;
    const kick = game.state.screenKick * 34 * view.dpr;
    const x = w * 0.52 + bob;
    const y = h * 0.82 + kick;
    const scale = clamp(w / 1200, 0.75, 1.25) * view.dpr;
    ctx.save();
    drawHands(x, y, scale, weapon);
    if (!drawWeaponSprite(x, y, scale, weapon)) drawWeaponShape(x, y, scale, weapon);
    drawWeaponLabel(x, y, scale, weapon);

    if (game.state.muzzleFlash > 0) {
      const flashOrigin = weaponFlashOrigin(x, y, scale, weapon);
      const flash = game.state.muzzleFlash * weaponFlashSize(weapon) * scale;
      ctx.globalAlpha = game.state.muzzleFlash;
      ctx.fillStyle = "#f5c15c";
      ctx.beginPath();
      ctx.moveTo(flashOrigin.x, flashOrigin.y);
      ctx.lineTo(flashOrigin.x + flash, flashOrigin.y - flash * 0.5);
      ctx.lineTo(flashOrigin.x + flash * 0.78, flashOrigin.y + flash * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawWeaponSprite(x, y, scale, weapon) {
    const sheet = weaponSheetCanvas || weaponSheet;
    const sheetWidth = weaponSheetCanvas ? weaponSheetCanvas.width : weaponSheet.naturalWidth;
    const sheetHeight = weaponSheetCanvas ? weaponSheetCanvas.height : weaponSheet.naturalHeight;
    if (!sheetWidth || !sheetHeight) return false;
    const cols = 3;
    const rows = 2;
    const cellW = sheetWidth / cols;
    const cellH = sheetHeight / rows;
    const cell = weapon.artCell ?? 0;
    const sx = (cell % cols) * cellW;
    const sy = Math.floor(cell / cols) * cellH;
    const drawW = (weapon.id === "pistol" || weapon.id === "cannon" ? 250 : 360) * scale;
    const drawH = drawW * (cellH / cellW);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sheet, sx, sy, cellW, cellH, x - drawW * 0.44, y - drawH * 0.58, drawW, drawH);
    ctx.restore();
    return true;
  }

  function drawHands(x, y, scale, weapon) {
    const leftOffset = weapon.id === "pistol" || weapon.id === "cannon" ? -72 : -118;
    const rightOffset = weapon.id === "pistol" || weapon.id === "cannon" ? 8 : 42;
    ctx.fillStyle = "#8d6849";
    fillRoundRect(ctx, x + leftOffset * scale, y + 24 * scale, 64 * scale, 34 * scale, 14 * scale);
    fillRoundRect(ctx, x + rightOffset * scale, y + 20 * scale, 72 * scale, 36 * scale, 14 * scale);
    ctx.fillStyle = "#5f4533";
    fillRoundRect(ctx, x + (leftOffset + 6) * scale, y + 30 * scale, 46 * scale, 10 * scale, 5 * scale);
    fillRoundRect(ctx, x + (rightOffset + 7) * scale, y + 27 * scale, 52 * scale, 10 * scale, 5 * scale);
  }

  function drawWeaponShape(x, y, scale, weapon) {
    const gunmetal = "#343a3b";
    const dark = "#171918";
    const wood = "#83583a";
    const brass = "#c28f3b";

    if (weapon.id === "rocket") {
      ctx.fillStyle = "#262c2a";
      fillRoundRect(ctx, x - 128 * scale, y - 58 * scale, 310 * scale, 54 * scale, 18 * scale);
      ctx.fillStyle = "#596057";
      fillRoundRect(ctx, x - 104 * scale, y - 48 * scale, 220 * scale, 34 * scale, 14 * scale);
      ctx.fillStyle = brass;
      fillRoundRect(ctx, x + 128 * scale, y - 52 * scale, 64 * scale, 42 * scale, 14 * scale);
      ctx.fillStyle = wood;
      fillRoundRect(ctx, x - 82 * scale, y + 0 * scale, 70 * scale, 78 * scale, 12 * scale);
    } else if (weapon.id === "shotgun") {
      drawLongGun(x, y, scale, 360, 20, wood, gunmetal);
      fillRoundRect(ctx, x - 108 * scale, y - 5 * scale, 170 * scale, 16 * scale, 8 * scale);
      ctx.fillStyle = dark;
      fillRoundRect(ctx, x + 22 * scale, y - 36 * scale, 190 * scale, 14 * scale, 5 * scale);
      fillRoundRect(ctx, x + 16 * scale, y - 19 * scale, 190 * scale, 11 * scale, 5 * scale);
    } else if (weapon.id === "smg") {
      drawLongGun(x, y, scale, 250, 34, dark, gunmetal);
      ctx.fillStyle = gunmetal;
      fillRoundRect(ctx, x - 42 * scale, y - 42 * scale, 138 * scale, 44 * scale, 7 * scale);
      ctx.fillStyle = brass;
      fillRoundRect(ctx, x - 10 * scale, y + 2 * scale, 28 * scale, 68 * scale, 5 * scale);
      ctx.fillStyle = dark;
      fillRoundRect(ctx, x + 84 * scale, y - 30 * scale, 118 * scale, 12 * scale, 5 * scale);
    } else if (weapon.id === "rifle") {
      drawLongGun(x, y, scale, 390, 28, wood, gunmetal);
      ctx.fillStyle = dark;
      fillRoundRect(ctx, x - 18 * scale, y - 62 * scale, 112 * scale, 15 * scale, 8 * scale);
      fillRoundRect(ctx, x + 26 * scale, y - 78 * scale, 24 * scale, 24 * scale, 12 * scale);
      fillRoundRect(ctx, x + 188 * scale, y - 33 * scale, 76 * scale, 10 * scale, 4 * scale);
    } else if (weapon.id === "cannon") {
      ctx.fillStyle = dark;
      fillRoundRect(ctx, x - 84 * scale, y - 30 * scale, 205 * scale, 58 * scale, 15 * scale);
      ctx.fillStyle = "#4b4d48";
      fillRoundRect(ctx, x - 58 * scale, y - 54 * scale, 174 * scale, 38 * scale, 17 * scale);
      ctx.fillStyle = wood;
      fillRoundRect(ctx, x - 78 * scale, y + 16 * scale, 58 * scale, 82 * scale, 10 * scale);
      ctx.fillStyle = brass;
      fillRoundRect(ctx, x + 90 * scale, y - 44 * scale, 42 * scale, 28 * scale, 10 * scale);
    } else {
      ctx.fillStyle = dark;
      fillRoundRect(ctx, x - 82 * scale, y - 24 * scale, 164 * scale, 46 * scale, 12 * scale);
      ctx.fillStyle = gunmetal;
      fillRoundRect(ctx, x - 52 * scale, y - 52 * scale, 145 * scale, 28 * scale, 8 * scale);
      ctx.fillStyle = wood;
      fillRoundRect(ctx, x - 58 * scale, y + 14 * scale, 44 * scale, 70 * scale, 9 * scale);
      ctx.fillStyle = "#1f2221";
      fillRoundRect(ctx, x + 78 * scale, y - 43 * scale, 58 * scale, 12 * scale, 5 * scale);
    }
  }

  function drawLongGun(x, y, scale, length, stockHeight, stockColor, metalColor) {
    ctx.fillStyle = stockColor;
    fillRoundRect(ctx, x - length * 0.42 * scale, y + 2 * scale, 128 * scale, stockHeight * scale, 9 * scale);
    ctx.fillStyle = metalColor;
    fillRoundRect(ctx, x - 80 * scale, y - 38 * scale, 190 * scale, 38 * scale, 8 * scale);
    ctx.fillStyle = "#181b1b";
    fillRoundRect(ctx, x + 62 * scale, y - 52 * scale, length * 0.54 * scale, 13 * scale, 5 * scale);
    ctx.fillStyle = "#5a3e2f";
    fillRoundRect(ctx, x - length * 0.48 * scale, y + 12 * scale, 76 * scale, 72 * scale, 12 * scale);
  }

  function weaponFlashOrigin(x, y, scale, weapon) {
    const offsets = {
      pistol: { x: 136, y: -37 },
      shotgun: { x: 222, y: -28 },
      smg: { x: 210, y: -24 },
      rifle: { x: 274, y: -28 },
      cannon: { x: 142, y: -34 },
      rocket: { x: 194, y: -30 },
    };
    const offset = offsets[weapon.id] || offsets.pistol;
    return { x: x + offset.x * scale, y: y + offset.y * scale };
  }

  function weaponFlashSize(weapon) {
    if (weapon.id === "shotgun") return 82;
    if (weapon.id === "rocket") return 108;
    if (weapon.id === "cannon") return 92;
    if (weapon.id === "rifle") return 66;
    return 54;
  }

  function drawWeaponLabel(x, y, scale, weapon) {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#f4e5c2";
    ctx.font = `800 ${Math.max(11, 12 * scale)}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(weapon.name, x + 104 * scale, y + 110 * scale);
    ctx.globalAlpha = 1;
  }

  function drawMiniMap() {
    const { w, h } = view;
    const size = clamp(Math.min(w * 0.2, h * 0.24), 112 * view.dpr, 176 * view.dpr);
    const x = 18 * view.dpr;
    const y = h - size - 18 * view.dpr;
    const scale = size / MAP_W;
    const center = size / 2;

    function miniPoint(worldX, worldY) {
      const dx = (worldX - game.player.x) * scale;
      const dy = (worldY - game.player.y) * scale;
      const angle = -game.player.angle - Math.PI / 2;
      return {
        x: center + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: center + dx * Math.sin(angle) + dy * Math.cos(angle),
      };
    }

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(8, 7, 6, 0.68)";
    fillRoundRect(ctx, x, y, size, size, 8 * view.dpr);
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    ctx.translate(x, y);

    for (let yy = 0; yy < mapSystem.map.length; yy += 1) {
      for (let xx = 0; xx < mapSystem.map[yy].length; xx += 1) {
        const tile = mapSystem.map[yy][xx];
        if (tile === 1 || tile === 3) {
          const p = miniPoint(xx + 0.5, yy + 0.5);
          ctx.fillStyle = tile === 3 ? "#5a3329" : "#2b2923";
          ctx.fillRect(p.x - scale * 0.5, p.y - scale * 0.5, scale + 0.4, scale + 0.4);
        } else if (tile === 2) {
          const p = miniPoint(xx + 0.5, yy + 0.5);
          ctx.fillStyle = "#b88530";
          ctx.fillRect(p.x - scale * 0.5, p.y - scale * 0.5, scale + 0.4, scale + 0.4);
        }
      }
    }

    ctx.fillStyle = "#9b1d24";
    game.zombies.forEach((zombie) => {
      const p = miniPoint(zombie.x, zombie.y);
      ctx.beginPath();
      ctx.fillStyle = zombie.type.body;
      ctx.arc(p.x, p.y, Math.max(2, scale * 0.45), 0, TAU);
      ctx.fill();
    });

    ctx.fillStyle = "#e6b84b";
    game.ammoDrops.forEach((drop) => {
      const p = miniPoint(drop.x, drop.y);
      ctx.fillRect(p.x - scale * 0.28, p.y - scale * 0.28, scale * 0.56, scale * 0.56);
    });

    ctx.translate(center, center);
    ctx.fillStyle = "#f0dfb9";
    ctx.beginPath();
    ctx.moveTo(0, -scale * 0.95);
    ctx.lineTo(-scale * 0.55, scale * 0.65);
    ctx.lineTo(scale * 0.55, scale * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLowHealth() {
    if (game.player.health > 35) return;
    const alpha = clamp((35 - game.player.health) / 35, 0, 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#7d1017";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  function render() {
    resizeCanvas();
    const depths = [];
    renderWorld(depths);
    renderSprites(depths);
    drawWeaponView();
    drawMiniMap();
    drawLowHealth();
  }

  return { render };
}
