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
    let base = [74, 68, 58];
    if ((hit.mapX + hit.mapY) % 5 === 0) base = [80, 86, 73];
    if (hit.tile === COUNTER) base = [92, 54, 42];
    const stripe = Math.floor(hit.wallX * 10) % 2 === 0 ? 0.92 : 1.04;
    const side = hit.side === 1 ? 0.78 : 1;
    const fog = clamp(1.1 - correctedDist / 20, 0.2, 1);
    return shadeRgb(base, stripe * side * fog);
  }

  function renderWorld(depths) {
    const { w, h } = view;
    const horizon = h * 0.5 + Math.sin(game.player.bob) * game.state.screenKick * h * 0.01;

    const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
    ceiling.addColorStop(0, "#0b0a09");
    ceiling.addColorStop(1, "#24201c");
    ctx.fillStyle = ceiling;
    ctx.fillRect(0, 0, w, horizon);

    const floor = ctx.createLinearGradient(0, horizon, 0, h);
    floor.addColorStop(0, "#312820");
    floor.addColorStop(1, "#090807");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#c89b55";
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
        else drawZombie(projected, sprite);
      });
  }

  function drawCandle(projected) {
    const s = projected.size;
    const x = projected.screenX;
    const y = projected.bottom;
    ctx.save();
    ctx.globalAlpha = clamp(1.2 - projected.dist / 18, 0.35, 1);
    ctx.fillStyle = "rgba(220, 148, 54, 0.18)";
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
    ctx.globalAlpha = clamp(1.25 - projected.dist / 18, 0.42, 1);
    ctx.fillStyle = "rgba(20, 14, 8, 0.78)";
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

  function drawZombie(projected, zombie) {
    const s = projected.size;
    const x = projected.screenX;
    const top = projected.top;
    const bottom = projected.bottom;
    const width = s * 0.38;
    const shade = clamp(1.15 - projected.dist / 17, 0.28, 1);
    const sway = Math.sin(zombie.sway) * s * 0.035;
    const hit = zombie.hitFlash > 0;

    ctx.save();
    ctx.globalAlpha = shade;
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x, bottom, width * 0.85, s * 0.08, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = hit ? "#e8dfc9" : "#6d7c53";
    ctx.beginPath();
    ctx.arc(x + sway, top + s * 0.2, s * 0.12, 0, TAU);
    ctx.fill();

    ctx.fillStyle = hit ? "#e8dfc9" : "#7b2f37";
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
    const y = h * 0.86 + kick;
    const scale = clamp(w / 1200, 0.75, 1.25) * view.dpr;
    const longGun = weapon.id === "rifle" || weapon.id === "shotgun";
    const bodyW = (longGun ? 260 : 190) * scale;
    const bodyH = 46 * scale;

    ctx.save();
    ctx.fillStyle = "rgba(31, 24, 21, 0.82)";
    fillRoundRect(ctx, x - bodyW * 0.42, y - bodyH * 0.2, bodyW * 0.82, bodyH, 8 * scale);
    ctx.fillStyle = "#393a36";
    fillRoundRect(ctx, x - bodyW * 0.35, y - bodyH * 0.62, bodyW * 0.78, bodyH * 0.34, 6 * scale);
    ctx.fillStyle = "#171717";
    fillRoundRect(ctx, x + bodyW * 0.18, y - bodyH * 0.76, bodyW * 0.5, bodyH * 0.18, 5 * scale);
    ctx.fillStyle = "#8a5b3c";
    fillRoundRect(ctx, x - bodyW * 0.32, y + bodyH * 0.34, bodyW * 0.32, bodyH * 1.1, 8 * scale);
    ctx.fillStyle = "#614131";
    fillRoundRect(ctx, x - bodyW * 0.55, y + bodyH * 0.18, bodyW * 0.24, bodyH * 0.8, 8 * scale);

    if (game.state.muzzleFlash > 0) {
      const flash = game.state.muzzleFlash * (weapon.id === "shotgun" ? 72 : 54) * scale;
      ctx.globalAlpha = game.state.muzzleFlash;
      ctx.fillStyle = "#f5c15c";
      ctx.beginPath();
      ctx.moveTo(x + bodyW * 0.72, y - bodyH * 0.67);
      ctx.lineTo(x + bodyW * 0.72 + flash, y - bodyH * 1.05);
      ctx.lineTo(x + bodyW * 0.72 + flash * 0.72, y - bodyH * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawMiniMap() {
    const { w, h } = view;
    const size = clamp(Math.min(w * 0.2, h * 0.24), 112 * view.dpr, 176 * view.dpr);
    const x = 18 * view.dpr;
    const y = h - size - 18 * view.dpr;
    const scale = size / MAP_W;

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(8, 7, 6, 0.68)";
    fillRoundRect(ctx, x, y, size, size, 8 * view.dpr);

    for (let yy = 0; yy < mapSystem.map.length; yy += 1) {
      for (let xx = 0; xx < mapSystem.map[yy].length; xx += 1) {
        const tile = mapSystem.map[yy][xx];
        if (tile === 1 || tile === 3) {
          ctx.fillStyle = tile === 3 ? "#5a3329" : "#2b2923";
          ctx.fillRect(x + xx * scale, y + yy * scale, scale + 0.4, scale + 0.4);
        } else if (tile === 2) {
          ctx.fillStyle = "#b88530";
          ctx.fillRect(x + xx * scale, y + yy * scale, scale + 0.4, scale + 0.4);
        }
      }
    }

    ctx.fillStyle = "#9b1d24";
    game.zombies.forEach((zombie) => {
      ctx.beginPath();
      ctx.arc(x + zombie.x * scale, y + zombie.y * scale, Math.max(2, scale * 0.45), 0, TAU);
      ctx.fill();
    });

    ctx.translate(x + game.player.x * scale, y + game.player.y * scale);
    ctx.rotate(game.player.angle);
    ctx.fillStyle = "#f0dfb9";
    ctx.beginPath();
    ctx.moveTo(scale * 0.9, 0);
    ctx.lineTo(-scale * 0.6, -scale * 0.45);
    ctx.lineTo(-scale * 0.6, scale * 0.45);
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
