/**
 * Deterministic PRNG using Mulberry32 & 32-bit integer hash functions.
 * Ensures identical terrain foliage and prop placement across client sessions and multiplayer.
 */

export function hash32(x: number, z: number, seed = 1337): number {
  let h = seed ^ (x * 374761393) ^ (z * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createChunkPRNG(
  chunkX: number,
  chunkZ: number,
  worldSeed = 1337
): () => number {
  const seed = hash32(chunkX, chunkZ, worldSeed);
  return mulberry32(seed);
}
