import { getBeachInfluence, getBeachSurfaceHeight } from './beach';
import { getRoadFactor, getRoadCenterX } from './road';

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return (
    a * (1 - ux) * (1 - uz) +
    b * ux * (1 - uz) +
    c * (1 - ux) * uz +
    d * ux * uz
  );
}

function fbm(x: number, z: number, octaves = 5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 0.032;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise(x * frequency, z * frequency) * 2 - 1);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }

  return value / maxValue;
}

/** Height displacement in plane local space (before mesh rotation). */
export function getBaseTerrainHeight(x: number, z: number): number {
  const n = fbm(x, z);
  const hills = n * 9.5;
  const ridges = Math.pow(Math.abs(n), 1.6) * Math.sign(n) * 3.5;
  const rawHeight = hills + ridges;

  // Carve road slope into hillside: road follows smooth grade
  const worldZ = -z;
  const roadFactor = getRoadFactor(x, worldZ);
  if (roadFactor > 0.01) {
    const roadX = getRoadCenterX(worldZ);
    const roadCenterBaseHeight = fbm(roadX, z) * 9.5 + Math.pow(Math.abs(fbm(roadX, z)), 1.6) * 3.5;
    return rawHeight * (1.0 - roadFactor * 0.85) + roadCenterBaseHeight * (roadFactor * 0.85);
  }

  return rawHeight;
}

export function getTerrainHeight(x: number, z: number): number {
  const worldZ = -z;
  const base = getBaseTerrainHeight(x, z);
  const beachW = getBeachInfluence(x);
  if (beachW <= 0) return base;
  const beach = getBeachSurfaceHeight(x, worldZ);
  const flattened = base * (1 - beachW * 0.9);
  return flattened * (1 - beachW) + beach * beachW;
}

export const TERRAIN_BASE_Y = -1;

/** World-space Y for a point on the terrain surface (matches rotated mesh). */
export function getWorldTerrainY(worldX: number, worldZ: number): number {
  return TERRAIN_BASE_Y + getTerrainHeight(worldX, -worldZ);
}
