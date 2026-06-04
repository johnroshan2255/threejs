/** Full inland hills (right of this X). */
export const INLAND_FULL_X = 28;
/** Full beach shaping (left of this X). */
export const BEACH_FULL_X = 10;
/** Dry sand gives way to wet shore. */
export const WET_SAND_START_X = 2;
/** Open water dominant left of this X. */
export const SHORE_LINE_X = -4;
export const DEEP_OCEAN_X = -30;

/** @deprecated aliases */
export const BEACH_LAND_EDGE_X = INLAND_FULL_X;
export const SAND_INLAND_X = BEACH_FULL_X;

export const BEACH_WATER_WORLD_Y = -1.05;

const TERRAIN_BASE = -1;
const WATER_LOCAL = BEACH_WATER_WORLD_Y - TERRAIN_BASE;

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Smoother than smoothstep — gentle ease for zone blends. */
export function smootherstep(t: number): number {
  const c = clamp01(t);
  return c * c * c * (c * (c * 6 - 15) + 10);
}

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/** 0 = inland mud hills, 1 = full beach height/color. */
export function getLandToBeachMix(worldX: number): number {
  if (worldX >= INLAND_FULL_X) return 0;
  if (worldX <= BEACH_FULL_X) return 1;
  return smootherstep(
    (INLAND_FULL_X - worldX) / (INLAND_FULL_X - BEACH_FULL_X)
  );
}

/** @deprecated */
export function getBeachInfluence(worldX: number): number {
  return getLandToBeachMix(worldX);
}

/** 0 = dry sand, 1 = wet shore / shallow water. */
export function getShoreWetMix(
  worldX: number,
  worldY: number,
  _worldZ: number
): number {
  if (worldX >= WET_SAND_START_X + 8) return 0;
  if (worldX <= SHORE_LINE_X - 4) return 1;

  const xT = smootherstep(
    (WET_SAND_START_X + 8 - worldX) /
      (WET_SAND_START_X + 8 - (SHORE_LINE_X - 4))
  );

  const depth = BEACH_WATER_WORLD_Y + 0.18 - worldY;
  const depthT = smoothstep(depth / 0.45);

  return clamp01(xT * 0.55 + depthT * 0.5);
}

export function isInOcean(worldX: number, worldY: number, _worldZ: number): boolean {
  if (worldX > SHORE_LINE_X + 2) return false;
  return worldY < BEACH_WATER_WORLD_Y + 0.28;
}

export function isDrySand(worldX: number, _worldZ: number): boolean {
  return worldX >= SHORE_LINE_X + 1 && worldX < BEACH_FULL_X + 2;
}

export function isBeachZone(worldX: number, worldZ: number): boolean {
  return getLandToBeachMix(worldX) > 0.02 && !isInOcean(worldX, BEACH_WATER_WORLD_Y, worldZ);
}

/** Continuous height: deep ocean → wet shore → dry sand. */
export function getBeachSurfaceHeight(worldX: number, worldZ: number): number {
  const ripple =
    Math.sin(worldX * 0.16) * 0.035 +
    Math.sin(worldZ * 0.12) * 0.028;

  const drySand = 0.24;
  const wetSand = WATER_LOCAL + 0.1;
  const shallowFloor = WATER_LOCAL - 0.45;
  const deepFloor = WATER_LOCAL - 2.55;

  if (worldX <= DEEP_OCEAN_X) {
    return deepFloor + ripple * 0.08;
  }

  if (worldX < SHORE_LINE_X - 6) {
    const t = smootherstep(
      (worldX - DEEP_OCEAN_X) / (SHORE_LINE_X - 6 - DEEP_OCEAN_X)
    );
    return deepFloor + (shallowFloor - deepFloor) * t + ripple * 0.1;
  }

  if (worldX < WET_SAND_START_X + 4) {
    const t = smootherstep(
      (worldX - (SHORE_LINE_X - 6)) / (WET_SAND_START_X + 4 - (SHORE_LINE_X - 6))
    );
    const atShore = WATER_LOCAL + 0.02;
    return shallowFloor + (atShore - shallowFloor) * t + ripple * 0.08;
  }

  if (worldX < BEACH_FULL_X) {
    const t = smootherstep(
      (worldX - WET_SAND_START_X) / (BEACH_FULL_X - WET_SAND_START_X)
    );
    return wetSand + (drySand - wetSand) * t + ripple;
  }

  return drySand + ripple;
}

export function getOceanSubmersion(
  worldX: number,
  worldY: number,
  _worldZ: number
): number {
  if (worldX > WET_SAND_START_X + 2) return 0;

  const depth = BEACH_WATER_WORLD_Y + 0.2 - worldY;
  if (depth <= 0) return 0;

  const zone =
    worldX < SHORE_LINE_X
      ? 1
      : 1 - (worldX - SHORE_LINE_X) / (WET_SAND_START_X + 2 - SHORE_LINE_X);

  return Math.min(1, (depth / 1.1) * Math.max(0.12, zone));
}
