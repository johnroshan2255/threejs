/** World chunk size. */
export const CHUNK_SIZE = 25;

/** Finite world boundaries (19x19 grid from -9 to +9 = 475m x 475m map). */
export const FINITE_WORLD_MIN_X = -9;
export const FINITE_WORLD_MAX_X = 9;
export const FINITE_WORLD_MIN_Z = -9;
export const FINITE_WORLD_MAX_Z = 9;

/** Helper to check if chunk coordinates are inside the finite world boundaries. */
export function isChunkInFiniteWorld(chunkX: number, chunkZ: number): boolean {
  return (
    chunkX >= FINITE_WORLD_MIN_X &&
    chunkX <= FINITE_WORLD_MAX_X &&
    chunkZ >= FINITE_WORLD_MIN_Z &&
    chunkZ <= FINITE_WORLD_MAX_Z
  );
}

/** LOD Tier definitions */
export type LodTier = 0 | 1 | 2;

export const LOD_CONFIG: Record<
  LodTier,
  {
    maxDistance: number;
    segments: number;
    targetTufts: number;
    hasPhysics: boolean;
  }
> = {
  0: {
    maxDistance: 1.5,
    segments: 64,
    targetTufts: 14_000,
    hasPhysics: true,
  },
  1: {
    maxDistance: 2.5,
    segments: 32,
    targetTufts: 5_000,
    hasPhysics: true,
  },
  2: {
    maxDistance: 4.5,
    segments: 16,
    targetTufts: 0,
    hasPhysics: false,
  },
};

/** Max instanced tuft slots per chunk. */
export const GRASS_TUFT_MAX_CAPACITY = 16_000;

/** Tufts attempted per frame while a chunk is building. */
export const GRASS_BUILD_BATCH = 3_500;

/** Rocks on bare sand per terrain chunk. */
export const PROPS_PER_CHUNK = 0;

/** Manhattan radius for 3D grass (LOD 0 & 1). */
export const GRASS_VIEW_RADIUS = 2;

/** Bush LOD radius. */
export const BUSH_VIEW_RADIUS = 1;
export const BUSHES_PER_CHUNK = 0;

export function chunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

/** Chunk index from world X/Z (chunk 0,0 is centered on origin). */
export function worldToChunk(worldX: number, worldZ: number): {
  chunkX: number;
  chunkZ: number;
} {
  const half = CHUNK_SIZE / 2;
  return {
    chunkX: Math.floor((worldX + half) / CHUNK_SIZE),
    chunkZ: Math.floor((worldZ + half) / CHUNK_SIZE),
  };
}

export function chunkWorldCenter(chunkX: number, chunkZ: number): {
  x: number;
  z: number;
} {
  return {
    x: chunkX * CHUNK_SIZE,
    z: chunkZ * CHUNK_SIZE,
  };
}
