import { PLAYER_START, weapons } from "./config.js";

export function createPlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    angle: PLAYER_START.angle,
    health: 100,
    maxHealth: 100,
    radius: 0.22,
    bob: 0,
    bobSpeed: 0,
  };
}

export function newRunState(mode = "menu") {
  const ammo = {};
  weapons.forEach((weapon) => {
    ammo[weapon.id] = {
      mag: weapon.mag,
      reserve: weapon.reserve,
    };
  });

  return {
    mode,
    round: 1,
    points: 0,
    kills: 0,
    roundTotal: 0,
    roundSpawned: 0,
    spawnTimer: 0,
    roundBreak: 0,
    message: "Survive the house.",
    messageTimer: 0,
    owned: new Set(["pistol"]),
    weaponIndex: 0,
    ammo,
    reloading: 0,
    fireCooldown: 0,
    muzzleFlash: 0,
    damageFlash: 0,
    screenKick: 0,
    gameTime: 0,
  };
}
