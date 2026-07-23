/**
 * Procedural Winding Dirt Road System (Far Cry 4 style mountain pass road).
 * Generates a smooth winding road spline through the hill terrain.
 */

function hash21(x: number, z: number): number {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Road centerline position for a given Z coordinate (winding S-curves). */
export function getRoadCenterX(z: number): number {
  const c1 = Math.sin(z * 0.02) * 45;
  const c2 = Math.sin(z * 0.05 + 1.2) * 20;
  const c3 = Math.cos(z * 0.008) * 15;
  return c1 + c2 + c3;
}

/** Distance from (worldX, worldZ) to the nearest mountain road centerline. */
export function getRoadDistance(worldX: number, worldZ: number): number {
  // Main winding mountain pass road
  const roadX = getRoadCenterX(worldZ);
  const dx = worldX - roadX;

  // Secondary connecting branch road
  const branchZ = Math.sin(worldX * 0.025 + 0.8) * 35;
  const dzBranch = worldZ - branchZ;

  const distMain = Math.abs(dx);
  const distBranch = Math.hypot(dx * 0.3, dzBranch);

  return Math.min(distMain, distBranch);
}

export const ROAD_WIDTH = 5.5;

/** 1.0 = center of road, 0.0 = off road in grass. */
export function getRoadFactor(worldX: number, worldZ: number): number {
  const dist = getRoadDistance(worldX, worldZ);
  return 1.0 - Math.min(1.0, Math.max(0.0, (dist - 1.0) / (ROAD_WIDTH + 1.5)));
}

/** Dual wheel ruts factor (1.0 = inside tire tracks, 0.0 = center/edges). */
export function getRoadRutFactor(worldX: number, worldZ: number): number {
  const roadX = getRoadCenterX(worldZ);
  const relX = Math.abs(worldX - roadX);
  const rutLeft = Math.abs(relX - 1.5);
  const rutRight = Math.abs(relX + 1.5);
  const rutDist = Math.min(rutLeft, rutRight);

  return 1.0 - Math.min(1.0, rutDist / 0.9);
}
