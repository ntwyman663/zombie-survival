import { COUNTER, EMPTY, MAP_H, MAP_W, SHOP, WALL } from "./config.js";

export function buildMap() {
  const grid = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(WALL));

  const carveRect = (x, y, width, height, value = EMPTY) => {
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) {
        if (xx > 0 && yy > 0 && xx < MAP_W - 1 && yy < MAP_H - 1) {
          grid[yy][xx] = value;
        }
      }
    }
  };

  const carveH = (x1, x2, y, thickness = 3) => {
    const start = Math.min(x1, x2);
    const width = Math.abs(x2 - x1) + 1;
    carveRect(start, y - Math.floor(thickness / 2), width, thickness);
  };

  const carveV = (y1, y2, x, thickness = 3) => {
    const start = Math.min(y1, y2);
    const height = Math.abs(y2 - y1) + 1;
    carveRect(x - Math.floor(thickness / 2), start, thickness, height);
  };

  [
    [17, 32, 7, 7],
    [13, 20, 15, 10],
    [2, 23, 11, 14],
    [28, 23, 11, 14],
    [2, 14, 11, 8],
    [28, 14, 11, 8],
    [14, 3, 13, 11],
    [2, 3, 11, 9],
    [28, 3, 11, 9],
    [15, 15, 11, 4],
  ].forEach((room) => carveRect(...room));

  carveV(27, 35, 20, 5);
  carveH(7, 34, 26, 3);
  carveV(8, 26, 20, 3);
  carveH(7, 34, 8, 3);
  carveV(8, 19, 7, 3);
  carveV(8, 19, 33, 3);
  carveH(7, 20, 18, 3);
  carveH(20, 33, 18, 3);
  carveH(8, 32, 34, 3);

  for (let y = 16; y <= 19; y += 1) {
    for (let x = 4; x <= 10; x += 1) {
      grid[y][x] = SHOP;
    }
  }

  [
    [4, 15],
    [5, 15],
    [6, 15],
    [9, 15],
    [10, 15],
    [15, 22],
    [25, 22],
    [15, 27],
    [25, 27],
    [5, 27],
    [9, 32],
    [32, 27],
    [36, 32],
    [17, 6],
    [23, 6],
    [6, 6],
    [34, 6],
  ].forEach(([x, y]) => {
    if (grid[y][x] === EMPTY || grid[y][x] === SHOP) grid[y][x] = COUNTER;
  });

  for (let x = 16; x <= 24; x += 1) {
    if (x !== 20) grid[11][x] = COUNTER;
  }

  return grid;
}

export function createMapSystem(map) {
  const pathCache = new Map();

  function tileAt(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return WALL;
    return map[iy][ix];
  }

  function isSolidTile(tile) {
    return tile === WALL || tile === COUNTER;
  }

  function isSolidAt(x, y) {
    return isSolidTile(tileAt(x, y));
  }

  function canStandAt(x, y, radius) {
    return (
      !isSolidAt(x - radius, y - radius) &&
      !isSolidAt(x + radius, y - radius) &&
      !isSolidAt(x - radius, y + radius) &&
      !isSolidAt(x + radius, y + radius)
    );
  }

  function tileCenter(tile) {
    return { x: tile.x + 0.5, y: tile.y + 0.5 };
  }

  function tileKey(x, y) {
    return `${x},${y}`;
  }

  function parseTileKey(key) {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  }

  function isWalkableTile(x, y, radius = 0.29) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    if (isSolidTile(map[y][x])) return false;
    return canStandAt(x + 0.5, y + 0.5, radius);
  }

  function findNearestWalkableTile(x, y, radius = 0.29) {
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    if (isWalkableTile(startX, startY, radius)) return { x: startX, y: startY };

    for (let r = 1; r <= 4; r += 1) {
      for (let yy = startY - r; yy <= startY + r; yy += 1) {
        for (let xx = startX - r; xx <= startX + r; xx += 1) {
          if (Math.abs(xx - startX) !== r && Math.abs(yy - startY) !== r) continue;
          if (isWalkableTile(xx, yy, radius)) return { x: xx, y: yy };
        }
      }
    }

    return null;
  }

  function findPath(start, goal, radius = 0.29) {
    const startTile = findNearestWalkableTile(start.x, start.y, radius);
    const goalTile = findNearestWalkableTile(goal.x, goal.y, radius);
    if (!startTile || !goalTile) return [];

    const cacheKey = `${tileKey(startTile.x, startTile.y)}>${tileKey(goalTile.x, goalTile.y)}:${radius}`;
    if (pathCache.has(cacheKey)) return pathCache.get(cacheKey).map((point) => ({ ...point }));

    const open = [{ ...startTile, g: 0, f: Math.abs(goalTile.x - startTile.x) + Math.abs(goalTile.y - startTile.y) }];
    const cameFrom = new Map();
    const gScore = new Map([[tileKey(startTile.x, startTile.y), 0]]);
    const closed = new Set();
    const neighbors = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      const currentKey = tileKey(current.x, current.y);
      if (current.x === goalTile.x && current.y === goalTile.y) {
        const path = [];
        let key = currentKey;
        while (cameFrom.has(key)) {
          path.push(tileCenter(parseTileKey(key)));
          key = cameFrom.get(key);
        }
        path.reverse();
        pathCache.set(cacheKey, path);
        if (pathCache.size > 160) pathCache.clear();
        return path.map((point) => ({ ...point }));
      }

      closed.add(currentKey);
      neighbors.forEach((dir) => {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const nextKey = tileKey(nx, ny);
        if (closed.has(nextKey) || !isWalkableTile(nx, ny, radius)) return;

        const tentative = gScore.get(currentKey) + 1;
        if (tentative >= (gScore.get(nextKey) ?? Infinity)) return;

        cameFrom.set(nextKey, currentKey);
        gScore.set(nextKey, tentative);
        const h = Math.abs(goalTile.x - nx) + Math.abs(goalTile.y - ny);
        const existing = open.find((item) => item.x === nx && item.y === ny);
        if (existing) {
          existing.g = tentative;
          existing.f = tentative + h;
        } else {
          open.push({ x: nx, y: ny, g: tentative, f: tentative + h });
        }
      });
    }

    return [];
  }

  function tryMoveActor(actor, dx, dy, radius) {
    const nx = actor.x + dx;
    const ny = actor.y + dy;
    if (canStandAt(nx, actor.y, radius)) actor.x = nx;
    if (canStandAt(actor.x, ny, radius)) actor.y = ny;
  }

  function castRay(player, angle, maxDist = 60) {
    const dirX = Math.cos(angle) || 0.000001;
    const dirY = Math.sin(angle) || 0.000001;
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaX = Math.abs(1 / dirX);
    const deltaY = Math.abs(1 / dirY);
    const stepX = dirX < 0 ? -1 : 1;
    const stepY = dirY < 0 ? -1 : 1;
    let sideDistX = dirX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
    let sideDistY = dirY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
    let side = 0;
    let tile = WALL;
    let hit = false;

    for (let i = 0; i < 180; i += 1) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaY;
        mapY += stepY;
        side = 1;
      }

      if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) {
        tile = WALL;
        hit = true;
        break;
      }

      tile = map[mapY][mapX];
      if (isSolidTile(tile)) {
        hit = true;
        break;
      }

      if (Math.min(sideDistX, sideDistY) > maxDist + 2) break;
    }

    if (!hit) return { dist: maxDist, side, tile: EMPTY, wallX: 0, mapX, mapY };

    let dist =
      side === 0
        ? (mapX - player.x + (1 - stepX) / 2) / dirX
        : (mapY - player.y + (1 - stepY) / 2) / dirY;
    dist = Math.max(0.0001, dist);
    let wallX = side === 0 ? player.y + dist * dirY : player.x + dist * dirX;
    wallX -= Math.floor(wallX);

    return { dist, side, tile, wallX, mapX, mapY };
  }

  return {
    map,
    tileAt,
    isSolidTile,
    canStandAt,
    tryMoveActor,
    castRay,
    isWalkableTile,
    findNearestWalkableTile,
    findPath,
  };
}
