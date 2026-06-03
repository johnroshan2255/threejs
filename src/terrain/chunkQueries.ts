import {
  CHUNK_SIZE,
  chunkKey,
  chunkWorldCenter,
  TERRAIN_VIEW_RADIUS,
  worldToChunk,
} from './chunkConfig';

/** How far from chunk center (0–1 of half-size) before we preload the next chunk. */
const EDGE_PRELOAD = 0.38;

/** Extra chunk(s) to load ahead of the player (position + velocity). */
export function getLookaheadChunks(
  worldX: number,
  worldZ: number,
  velX: number,
  velZ: number
): { chunkX: number; chunkZ: number }[] {
  const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
  const { x: cx, z: cz } = chunkWorldCenter(chunkX, chunkZ);
  const half = CHUNK_SIZE / 2;
  const relX = (worldX - cx) / half;
  const relZ = (worldZ - cz) / half;

  const out: { chunkX: number; chunkZ: number }[] = [];
  const seen = new Set<string>();

  const add = (x: number, z: number) => {
    const k = chunkKey(x, z);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ chunkX: x, chunkZ: z });
  };

  if (relX > EDGE_PRELOAD || velX > 1.2) add(chunkX + 1, chunkZ);
  if (relX < -EDGE_PRELOAD || velX < -1.2) add(chunkX - 1, chunkZ);
  if (relZ > EDGE_PRELOAD || velZ > 1.2) add(chunkX, chunkZ + 1);
  if (relZ < -EDGE_PRELOAD || velZ < -1.2) add(chunkX, chunkZ - 1);

  if (velX > 2 && velZ > 2) add(chunkX + 1, chunkZ + 1);
  if (velX > 2 && velZ < -2) add(chunkX + 1, chunkZ - 1);
  if (velX < -2 && velZ > 2) add(chunkX - 1, chunkZ + 1);
  if (velX < -2 && velZ < -2) add(chunkX - 1, chunkZ - 1);

  return out;
}

/** All terrain chunks that should exist around the player (every frame). */
export function getNeededTerrainChunks(
  worldX: number,
  worldZ: number,
  velX: number,
  velZ: number
): Set<string> {
  const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
  const needed = new Set<string>();

  for (let dz = -TERRAIN_VIEW_RADIUS; dz <= TERRAIN_VIEW_RADIUS; dz++) {
    for (let dx = -TERRAIN_VIEW_RADIUS; dx <= TERRAIN_VIEW_RADIUS; dx++) {
      needed.add(chunkKey(chunkX + dx, chunkZ + dz));
    }
  }

  for (const ahead of getLookaheadChunks(worldX, worldZ, velX, velZ)) {
    needed.add(chunkKey(ahead.chunkX, ahead.chunkZ));
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        needed.add(chunkKey(ahead.chunkX + dx, ahead.chunkZ + dz));
      }
    }
  }

  return needed;
}
