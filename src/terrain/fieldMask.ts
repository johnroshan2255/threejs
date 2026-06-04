import { getLandToBeachMix } from './beach';

/** Where grass grows vs open sand (deterministic from world XZ). */

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

/** 0 = bare sand, 1 = lush grass patch. */
export function grassDensity(worldX: number, worldZ: number): number {
  const a = valueNoise(worldX * 0.07, worldZ * 0.07);
  const b = valueNoise(worldX * 0.11 + 40, worldZ * 0.11 - 20);
  return a * 0.65 + b * 0.35;
}

export function hasGrass(worldX: number, worldZ: number): boolean {
  if (getLandToBeachMix(worldX) > 0.04) return false;
  return grassDensity(worldX, worldZ) > 0.44;
}

export function isOpenGround(worldX: number, worldZ: number): boolean {
  if (getLandToBeachMix(worldX) > 0.04) return false;
  return !hasGrass(worldX, worldZ);
}

