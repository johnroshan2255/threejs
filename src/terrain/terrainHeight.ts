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
  let frequency = 0.04;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise(x * frequency, z * frequency) * 2 - 1);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }

  return value / maxValue;
}

/** Height displacement in plane local space (before mesh rotation). */
export function getTerrainHeight(x: number, z: number): number {
  const n = fbm(x, z);
  const hills = n * 4;
  const valleys = Math.pow(Math.abs(n), 1.5) * Math.sign(n) * 0.8;

  return hills + valleys;
}

export const TERRAIN_BASE_Y = -1;

/** World-space Y for a point on the terrain surface (matches rotated mesh). */
export function getWorldTerrainY(worldX: number, worldZ: number): number {
  return TERRAIN_BASE_Y + getTerrainHeight(worldX, -worldZ);
}
