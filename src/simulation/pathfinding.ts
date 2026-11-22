import { CELL_SIZE, FIELD_HALF_SIZE, GRID_SIZE } from './worldConfig';
import { Vec2 } from './types';

export function worldToGrid(pos: Vec2): { col: number; row: number } {
  const col = Math.max(
    0,
    Math.min(GRID_SIZE - 1, Math.floor((pos.x + FIELD_HALF_SIZE) / CELL_SIZE))
  );
  const row = Math.max(
    0,
    Math.min(GRID_SIZE - 1, Math.floor((pos.z + FIELD_HALF_SIZE) / CELL_SIZE))
  );
  return { col, row };
}

export function gridToWorld(col: number, row: number): Vec2 {
  return {
    x: -FIELD_HALF_SIZE + (col + 0.5) * CELL_SIZE,
    z: -FIELD_HALF_SIZE + (row + 0.5) * CELL_SIZE,
  };
}

function findNearestWalkable(
  col: number,
  row: number,
  blockedGrid: Uint8Array
): { col: number; row: number } {
  if (blockedGrid[row * GRID_SIZE + col] === 0) return { col, row };
  for (let r = 1; r <= 7; r++) {
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc >= 0 && nc < GRID_SIZE && nr >= 0 && nr < GRID_SIZE) {
          if (blockedGrid[nr * GRID_SIZE + nc] === 0) {
            return { col: nc, row: nr };
          }
        }
      }
    }
  }
  return { col, row };
}

function hasCleanLineOfSight(
  a: { col: number; row: number },
  b: { col: number; row: number },
  blockedGrid: Uint8Array,
  terrainCostGrid?: Float32Array
): boolean {
  const dx = b.col - a.col;
  const dz = b.row - a.row;
  const steps = Math.max(Math.abs(dx), Math.abs(dz)) * 2;
  if (steps === 0) return true;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = Math.round(a.col + dx * t);
    const r = Math.round(a.row + dz * t);
    if (c < 0 || c >= GRID_SIZE || r < 0 || r >= GRID_SIZE) return false;
    const idx = r * GRID_SIZE + c;
    if (blockedGrid[idx] === 1) return false;
    // Do not prune across expensive mud/slope/hazard cells so cost-weighted detours are preserved
    if (terrainCostGrid && terrainCostGrid[idx] > 1.25) return false;
  }
  return true;
}

export function findAStarPath(
  startPos: Vec2,
  goalPos: Vec2,
  blockedGrid: Uint8Array,
  terrainCostGrid?: Float32Array
): Vec2[] {
  const startRaw = worldToGrid(startPos);
  const goalRaw = worldToGrid(goalPos);

  const start = findNearestWalkable(startRaw.col, startRaw.row, blockedGrid);
  const goal = findNearestWalkable(goalRaw.col, goalRaw.row, blockedGrid);

  if (start.col === goal.col && start.row === goal.row) {
    return [{ x: goalPos.x, z: goalPos.z }];
  }

  const total = GRID_SIZE * GRID_SIZE;
  const gScore = new Float32Array(total).fill(Infinity);
  const fScore = new Float32Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const inOpen = new Uint8Array(total);

  const startIdx = start.row * GRID_SIZE + start.col;
  const goalIdx = goal.row * GRID_SIZE + goal.col;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(goal.col - start.col, goal.row - start.row);

  const openList: number[] = [startIdx];
  inOpen[startIdx] = 1;

  const dirs = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
  ];

  let iterations = 0;
  const maxIterations = 2800;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    let bestPos = 0;
    let bestF = fScore[openList[0]];
    for (let i = 1; i < openList.length; i++) {
      const f = fScore[openList[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }

    const current = openList[bestPos];
    openList.splice(bestPos, 1);
    inOpen[current] = 0;

    if (current === goalIdx) {
      const rawCells: { col: number; row: number }[] = [];
      let trace = current;
      while (trace !== -1) {
        rawCells.push({
          col: trace % GRID_SIZE,
          row: Math.floor(trace / GRID_SIZE),
        });
        trace = cameFrom[trace];
      }
      rawCells.reverse();

      const smoothed: { col: number; row: number }[] = [rawCells[0]];
      let anchor = 0;
      while (anchor < rawCells.length - 1) {
        let furthest = anchor + 1;
        for (let probe = rawCells.length - 1; probe > anchor + 1; probe--) {
          if (
            hasCleanLineOfSight(
              rawCells[anchor],
              rawCells[probe],
              blockedGrid,
              terrainCostGrid
            )
          ) {
            furthest = probe;
            break;
          }
        }
        smoothed.push(rawCells[furthest]);
        anchor = furthest;
      }

      const worldWaypoints = smoothed.slice(1).map((cell) => gridToWorld(cell.col, cell.row));
      if (worldWaypoints.length > 0) {
        worldWaypoints[worldWaypoints.length - 1] = { x: goalPos.x, z: goalPos.z };
      } else {
        worldWaypoints.push({ x: goalPos.x, z: goalPos.z });
      }
      return worldWaypoints;
    }

    closed[current] = 1;
    const cCol = current % GRID_SIZE;
    const cRow = Math.floor(current / GRID_SIZE);

    for (let d = 0; d < dirs.length; d++) {
      const nc = cCol + dirs[d][0];
      const nr = cRow + dirs[d][1];
      if (nc < 0 || nc >= GRID_SIZE || nr < 0 || nr >= GRID_SIZE) continue;

      const nIdx = nr * GRID_SIZE + nc;
      if (closed[nIdx] === 1 || blockedGrid[nIdx] === 1) continue;

      if (dirs[d][0] !== 0 && dirs[d][1] !== 0) {
        if (
          blockedGrid[cRow * GRID_SIZE + nc] === 1 ||
          blockedGrid[nr * GRID_SIZE + cCol] === 1
        ) {
          continue;
        }
      }

      const terrainWeight = terrainCostGrid ? terrainCostGrid[nIdx] : 1.0;
      const tentativeG = gScore[current] + dirs[d][2] * terrainWeight;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(goal.col - nc, goal.row - nr);
        if (inOpen[nIdx] === 0) {
          openList.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  return [{ x: goalPos.x, z: goalPos.z }];
}
