/** World chunk size (matches original single patch). */
export const CHUNK_SIZE = 25;

/** Vertices per chunk edge (lower = faster, more chunks visible). */
export const CHUNK_SEGMENTS = 48;

/** Terrain chunks to load around the player. */
export const TERRAIN_VIEW_RADIUS = 3;

/** Keep chunks longer than load radius to avoid visible holes while driving. */
export const TERRAIN_UNLOAD_RADIUS = 5;

/** Full-density grass (same as original single 25×25 field). */
export const GRASS_BLADES_PER_CHUNK = 300_000;

/** Manhattan radius for lush grass chunks (1 = 3×3 around player). */
export const GRASS_VIEW_RADIUS = 1;

/** Only a few simple bushes per grass chunk. */
export const BUSHES_PER_CHUNK = 3;

/** Same ring as grass so bushes appear where you drive. */
export const BUSH_VIEW_RADIUS = 1;

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
