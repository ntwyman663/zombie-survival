import { SHOP_CENTER, clamp, spawnPoints, weapons } from "./config.js";
import { createPlayer, newRunState } from "./state.js";

export function createSimulation({ canvas, ui, mapSystem, audio }) {
  let seed = 741337;

  const game = {
    player: createPlayer(),
    state: newRunState("menu"),
    zombies: [],
    particles: [],
    keys: new Set(),
    nearShop: false,
    pointerLockBlocked: false,
    currentWeapon,
    setMessage,
    initializeRun,
    beginReload,
    shoot,
    equipWeapon,
    buyOrEquipWeapon,
    openShop,
    closeShop,
    update,
  };

  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function currentWeapon() {
    return weapons[game.state.weaponIndex];
  }

  function setMessage(message, seconds = 2.4) {
    game.state.message = message;
    game.state.messageTimer = seconds;
  }

  function initializeRun() {
    seed = 741337;
    game.player = createPlayer();
    game.state = newRunState("playing");
    game.zombies = [];
    game.particles = [];
    startRound();
    ui.menuOverlay.classList.remove("active");
    ui.gameOverOverlay.classList.remove("active");
    ui.shopOverlay.classList.remove("active");
    ui.renderShop(game);
  }

  function startRound() {
    const round = game.state.round;
    game.state.roundTotal = 5 + round * 4;
    game.state.roundSpawned = 0;
    game.state.spawnTimer = 0.25;
    game.state.roundBreak = 0;
    setMessage(`Round ${round} begins`, 2.5);
  }

  function completeRound() {
    const bonus = 225 + game.state.round * 35;
    game.state.points += bonus;
    game.player.health = Math.min(game.player.maxHealth, game.player.health + 18);
    game.state.round += 1;
    game.state.roundBreak = 6;
    setMessage(`Round clear. Bonus ${bonus}`, 4.5);
  }

  function spawnZombie() {
    let best = spawnPoints[0];
    let bestScore = -Infinity;
    spawnPoints.forEach((point) => {
      const away = Math.hypot(point.x - game.player.x, point.y - game.player.y);
      const score = away + rnd() * 5;
      if (away > 7 && score > bestScore) {
        best = point;
        bestScore = score;
      }
    });

    const round = game.state.round;
    game.zombies.push({
      x: best.x + (rnd() - 0.5) * 0.7,
      y: best.y + (rnd() - 0.5) * 0.7,
      radius: 0.29,
      health: 42 + round * 16,
      maxHealth: 42 + round * 16,
      speed: 0.82 + Math.min(0.72, round * 0.055),
      damage: 8 + Math.floor(round * 1.7),
      attackCooldown: 0.8 + rnd() * 0.4,
      stagger: 0,
      hitFlash: 0,
      sway: rnd() * Math.PI * 2,
      points: 95 + round * 12,
      dead: false,
    });
  }

  function updateRound(dt) {
    if (game.state.roundBreak > 0) {
      game.state.roundBreak -= dt;
      if (game.state.roundBreak <= 0) startRound();
      return;
    }

    if (game.state.roundSpawned < game.state.roundTotal) {
      game.state.spawnTimer -= dt;
      if (game.state.spawnTimer <= 0) {
        spawnZombie();
        game.state.roundSpawned += 1;
        game.state.spawnTimer = clamp(1.65 - game.state.round * 0.075, 0.45, 1.65);
      }
    } else if (game.zombies.length === 0) {
      completeRound();
    }
  }

  function updatePlayer(dt) {
    let forward = 0;
    let strafe = 0;
    if (game.keys.has("KeyW") || game.keys.has("ArrowUp")) forward += 1;
    if (game.keys.has("KeyS") || game.keys.has("ArrowDown")) forward -= 1;
    if (game.keys.has("KeyD")) strafe += 1;
    if (game.keys.has("KeyA")) strafe -= 1;
    if (game.keys.has("ArrowLeft")) game.player.angle -= dt * 2.3;
    if (game.keys.has("ArrowRight")) game.player.angle += dt * 2.3;

    const magnitude = Math.hypot(forward, strafe);
    if (magnitude > 0) {
      forward /= magnitude;
      strafe /= magnitude;
    }

    const speed = game.keys.has("ShiftLeft") || game.keys.has("ShiftRight") ? 4.1 : 3.05;
    const moveX =
      Math.cos(game.player.angle) * forward * speed * dt +
      Math.cos(game.player.angle + Math.PI / 2) * strafe * speed * dt;
    const moveY =
      Math.sin(game.player.angle) * forward * speed * dt +
      Math.sin(game.player.angle + Math.PI / 2) * strafe * speed * dt;
    mapSystem.tryMoveActor(game.player, moveX, moveY, game.player.radius);

    game.player.bobSpeed = magnitude * speed;
    game.player.bob += dt * game.player.bobSpeed * 6.4;
    game.nearShop = Math.hypot(game.player.x - SHOP_CENTER.x, game.player.y - SHOP_CENTER.y) < 2.7;
  }

  function updateWeapons(dt) {
    game.state.fireCooldown = Math.max(0, game.state.fireCooldown - dt);
    game.state.muzzleFlash = Math.max(0, game.state.muzzleFlash - dt * 4.2);
    game.state.screenKick = Math.max(0, game.state.screenKick - dt * 7);

    if (game.state.reloading > 0) {
      game.state.reloading -= dt;
      if (game.state.reloading <= 0) {
        game.state.reloading = 0;
        const weapon = currentWeapon();
        game.state.ammo[weapon.id] = weapon.mag;
        setMessage(`${weapon.name} ready`, 1.2);
      }
    }
  }

  function updateZombies(dt) {
    for (const zombie of game.zombies) {
      zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
      zombie.stagger = Math.max(0, zombie.stagger - dt);
      zombie.hitFlash = Math.max(0, zombie.hitFlash - dt);
      zombie.sway += dt * 3.2;

      const dx = game.player.x - zombie.x;
      const dy = game.player.y - zombie.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 0.76) {
        if (zombie.attackCooldown <= 0) {
          zombie.attackCooldown = 0.86;
          game.player.health = Math.max(0, game.player.health - zombie.damage);
          game.state.damageFlash = 0.34;
          game.state.screenKick = Math.max(game.state.screenKick, 0.35);
          audio.playTone(110, 0.08, 0.08, "sawtooth");
          if (game.player.health <= 0) endGame();
        }
        continue;
      }

      const speed = zombie.speed * (zombie.stagger > 0 ? 0.3 : 1);
      const stepX = (dx / dist) * speed * dt;
      const stepY = (dy / dist) * speed * dt;

      if (mapSystem.canStandAt(zombie.x + stepX, zombie.y + stepY, zombie.radius)) {
        zombie.x += stepX;
        zombie.y += stepY;
      } else {
        mapSystem.tryMoveActor(zombie, stepX, 0, zombie.radius);
        mapSystem.tryMoveActor(zombie, 0, stepY, zombie.radius);
      }
    }
  }

  function updateParticles(dt) {
    game.particles = game.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return particle.life > 0;
    });
  }

  function update(dt) {
    game.state.gameTime += dt;
    game.state.messageTimer = Math.max(0, game.state.messageTimer - dt);
    if (game.state.messageTimer <= 0 && game.state.mode === "playing") {
      game.state.message = game.state.roundBreak > 0 ? "The halls are quiet." : "Survive the house.";
    }

    ui.damageVignette.classList.toggle("active", game.state.damageFlash > 0);
    game.state.damageFlash = Math.max(0, game.state.damageFlash - dt);

    if (game.state.mode === "playing") {
      updatePlayer(dt);
      updateWeapons(dt);
      updateRound(dt);
      updateZombies(dt);
      updateParticles(dt);
    } else {
      updateParticles(dt);
    }

    ui.updateHud(game);
  }

  function beginReload() {
    if (game.state.mode !== "playing" || game.state.reloading > 0) return;
    const weapon = currentWeapon();
    if (game.state.ammo[weapon.id] >= weapon.mag) return;
    game.state.reloading = weapon.reload;
    setMessage(`Reloading ${weapon.name}`, weapon.reload);
  }

  function findZombieHit(angle, range) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const wallDist = mapSystem.castRay(game.player, angle, range).dist;
    let best = null;
    let bestForward = Infinity;

    for (const zombie of game.zombies) {
      if (zombie.dead) continue;
      const dx = zombie.x - game.player.x;
      const dy = zombie.y - game.player.y;
      const forward = dx * dirX + dy * dirY;
      if (forward <= 0.1 || forward > range || forward > wallDist + 0.05) continue;
      const lateral = Math.abs(dx * -dirY + dy * dirX);
      if (lateral < zombie.radius + 0.14 && forward < bestForward) {
        bestForward = forward;
        best = zombie;
      }
    }

    return best ? { zombie: best, distance: bestForward } : null;
  }

  function shoot() {
    if (game.state.mode !== "playing" || game.state.reloading > 0 || game.state.fireCooldown > 0) return;
    const weapon = currentWeapon();
    if (game.state.ammo[weapon.id] <= 0) {
      beginReload();
      return;
    }

    game.state.ammo[weapon.id] -= 1;
    game.state.fireCooldown = weapon.rate;
    game.state.muzzleFlash = 1;
    game.state.screenKick = Math.max(game.state.screenKick, 0.32);
    audio.playShot(weapon);

    let hitAny = false;
    for (let i = 0; i < weapon.pellets; i += 1) {
      const pelletAngle = game.player.angle + (rnd() - 0.5) * weapon.spread;
      const hit = findZombieHit(pelletAngle, weapon.range);
      if (!hit) continue;
      hitAny = true;
      const falloff = clamp(1 - hit.distance / weapon.range * 0.28, 0.65, 1);
      damageZombie(hit.zombie, weapon.damage * falloff);
    }

    if (hitAny) setMessage("Hit", 0.5);
    if (game.state.ammo[weapon.id] <= 0) beginReload();
  }

  function damageZombie(zombie, amount) {
    if (zombie.dead) return;
    zombie.health -= amount;
    zombie.stagger = 0.16;
    zombie.hitFlash = 0.1;

    for (let i = 0; i < 3; i += 1) {
      game.particles.push({
        type: "blood",
        x: zombie.x + (rnd() - 0.5) * 0.2,
        y: zombie.y + (rnd() - 0.5) * 0.2,
        vx: (rnd() - 0.5) * 0.7,
        vy: (rnd() - 0.5) * 0.7,
        life: 0.35 + rnd() * 0.25,
      });
    }

    if (zombie.health <= 0) killZombie(zombie);
  }

  function killZombie(zombie) {
    zombie.dead = true;
    game.state.points += zombie.points;
    game.state.kills += 1;
    setMessage(`+${zombie.points} points`, 1.1);
    audio.playTone(180, 0.08, 0.07, "square");

    for (let i = 0; i < 8; i += 1) {
      game.particles.push({
        type: "blood",
        x: zombie.x + (rnd() - 0.5) * 0.35,
        y: zombie.y + (rnd() - 0.5) * 0.35,
        vx: (rnd() - 0.5) * 0.9,
        vy: (rnd() - 0.5) * 0.9,
        life: 0.45 + rnd() * 0.5,
      });
    }

    game.zombies = game.zombies.filter((item) => item !== zombie);
  }

  function equipWeapon(index) {
    const weapon = weapons[index];
    if (!weapon || !game.state.owned.has(weapon.id)) return;
    game.state.weaponIndex = index;
    game.state.reloading = 0;
    setMessage(weapon.name, 1.2);
    ui.renderShop(game);
  }

  function buyOrEquipWeapon(id) {
    const index = weapons.findIndex((weapon) => weapon.id === id);
    const weapon = weapons[index];
    if (!weapon) return;

    if (game.state.owned.has(id)) {
      equipWeapon(index);
      return;
    }

    if (game.state.points < weapon.cost) {
      setMessage("Not enough points", 1.4);
      ui.renderShop(game);
      return;
    }

    game.state.points -= weapon.cost;
    game.state.owned.add(id);
    game.state.ammo[id] = weapon.mag;
    equipWeapon(index);
    audio.playTone(520, 0.05, 0.06, "triangle");
    ui.renderShop(game);
  }

  function openShop() {
    if (game.state.mode !== "playing" || !game.nearShop) return;
    game.state.mode = "shop";
    ui.shopOverlay.classList.add("active");
    ui.renderShop(game);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function closeShop() {
    if (game.state.mode !== "shop") return;
    game.state.mode = "playing";
    ui.shopOverlay.classList.remove("active");
    canvas.focus();
  }

  function endGame() {
    if (game.state.mode === "gameover") return;
    game.state.mode = "gameover";
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ui.gameOverStats.textContent = `Round ${game.state.round}. Kills ${game.state.kills}. Points ${game.state.points}.`;
    ui.gameOverOverlay.classList.add("active");
    setMessage("Game over", 3);
  }

  ui.renderShop(game);
  ui.updateHud(game);
  return game;
}
