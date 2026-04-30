export const TAU = Math.PI * 2;
export const FOV = (Math.PI / 180) * 68;
export const MAP_W = 41;
export const MAP_H = 41;
export const EMPTY = 0;
export const WALL = 1;
export const SHOP = 2;
export const COUNTER = 3;
export const SHOP_CENTER = { x: 7.4, y: 17.8 };
export const PLAYER_START = { x: 20.5, y: 35.5, angle: -Math.PI / 2 };

export const weapons = [
  {
    id: "pistol",
    name: "Pistol",
    cost: 0,
    damage: 36,
    rate: 0.34,
    spread: 0.015,
    pellets: 1,
    mag: 12,
    reload: 1.05,
    range: 13,
    profile: "Balanced sidearm",
  },
  {
    id: "shotgun",
    name: "Gravebreak Shotgun",
    cost: 900,
    damage: 22,
    rate: 0.82,
    spread: 0.16,
    pellets: 8,
    mag: 6,
    reload: 1.45,
    range: 8.5,
    profile: "Wide blast, brutal up close",
  },
  {
    id: "smg",
    name: "Rattle SMG",
    cost: 1500,
    damage: 21,
    rate: 0.075,
    spread: 0.045,
    pellets: 1,
    mag: 34,
    reload: 1.25,
    range: 11,
    profile: "Fast fire for crowded halls",
  },
  {
    id: "rifle",
    name: "Iron Choir Rifle",
    cost: 2500,
    damage: 76,
    rate: 0.28,
    spread: 0.008,
    pellets: 1,
    mag: 18,
    reload: 1.55,
    range: 18,
    profile: "Precise, heavy hits at range",
  },
  {
    id: "cannon",
    name: "Black Candle Hand Cannon",
    cost: 4100,
    damage: 142,
    rate: 0.64,
    spread: 0.01,
    pellets: 1,
    mag: 6,
    reload: 1.75,
    range: 16,
    profile: "Slow, loud, and final",
  },
];

export const spawnPoints = [
  { x: 6.5, y: 6.5 },
  { x: 34.5, y: 6.5 },
  { x: 20.5, y: 5.5 },
  { x: 6.5, y: 31.5 },
  { x: 34.5, y: 31.5 },
  { x: 32.5, y: 17.5 },
  { x: 9.5, y: 25.5 },
  { x: 30.5, y: 25.5 },
  { x: 20.5, y: 23.5 },
];

export const decorSprites = [
  { type: "candle", x: 18.5, y: 32.8 },
  { type: "candle", x: 22.5, y: 32.8 },
  { type: "candle", x: 14.5, y: 21.5 },
  { type: "candle", x: 26.5, y: 21.5 },
  { type: "candle", x: 16.5, y: 5.5 },
  { type: "candle", x: 24.5, y: 5.5 },
  { type: "shop", x: SHOP_CENTER.x, y: SHOP_CENTER.y },
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function angleDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

export function shadeRgb(base, amount) {
  const r = Math.round(clamp(base[0] * amount, 0, 255));
  const g = Math.round(clamp(base[1] * amount, 0, 255));
  const b = Math.round(clamp(base[2] * amount, 0, 255));
  return `rgb(${r}, ${g}, ${b})`;
}

export function fillRoundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  context.fill();
}
