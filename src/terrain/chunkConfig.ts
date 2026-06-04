/** World chunk size (matches original single patch). */
export const CHUNK_SIZE = 25;

/** Vertices per chunk edge (lower = faster). */
export const CHUNK_SEGMENTS = 32;

/** Terrain chunks to load around the player (2 → 5×5). */
export const TERRAIN_VIEW_RADIUS = 2;

/** Keep chunks longer than load radius to avoid visible holes while driving. */
export const TERRAIN_UNLOAD_RADIUS = 4;

/** Max instanced tuft slots per chunk (only patches of the chunk fill grass). */
export const GRASS_TUFT_MAX_CAPACITY = 12_000;

/** Target tufts to place per chunk inside grass patches. */
export const GRASS_TARGET_TUFTS = 9_000;

/** Tufts attempted per frame while a chunk is building. */
export const GRASS_BUILD_BATCH = 2_500;

/** Rocks on bare sand per terrain chunk. */
export const PROPS_PER_CHUNK = 3;

/** @deprecated */
export const GRASS_TUFTS_PER_CHUNK = GRASS_TUFT_MAX_CAPACITY;

/** Manhattan radius for 3D grass (1 = 3×3 around player). */
export const GRASS_VIEW_RADIUS = 1;

/** Only a few simple bushes per grass chunk. */
export const BUSHES_PER_CHUNK = 3;

/** Same ring as grass. */
export const BUSH_VIEW_RADIUS = 1;

/** @deprecated Use GRASS_TUFTS_PER_CHUNK */
export const GRASS_BLADES_PER_CHUNK = GRASS_TUFTS_PER_CHUNK;

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
