import {
  chunkKey,
  isChunkInFiniteWorld,
  LOD_CONFIG,
  worldToChunk,
  type LodTier,
} from './chunkConfig';

/** Determines the LOD tier for a given chunk based on distance to player. */
export function getChunkLod(
  chunkX: number,
  chunkZ: number,
  playerChunkX: number,
  playerChunkZ: number
): LodTier | null {
  if (!isChunkInFiniteWorld(chunkX, chunkZ)) return null;

  const dist = Math.max(
    Math.abs(chunkX - playerChunkX),
    Math.abs(chunkZ - playerChunkZ)
  );

  if (dist <= LOD_CONFIG[0].maxDistance) return 0;
  if (dist <= LOD_CONFIG[1].maxDistance) return 1;
  if (dist <= LOD_CONFIG[2].maxDistance) return 2;

  return null;
}

export type ChunkLodMap = Map<string, { chunkX: number; chunkZ: number; lod: LodTier }>;

/** Map of all needed terrain chunks within finite world bounds and their target LOD. */
export function getNeededChunksWithLod(
  worldX: number,
  worldZ: number
): ChunkLodMap {
  const { chunkX: pX, chunkZ: pZ } = worldToChunk(worldX, worldZ);
  const needed = new Map<string, { chunkX: number; chunkZ: number; lod: LodTier }>();

  const maxDist = Math.ceil(LOD_CONFIG[2].maxDistance);

  for (let dz = -maxDist; dz <= maxDist; dz++) {
    for (let dx = -maxDist; dx <= maxDist; dx++) {
      const cx = pX + dx;
      const cz = pZ + dz;
      const lod = getChunkLod(cx, cz, pX, pZ);

      if (lod !== null) {
        needed.set(chunkKey(cx, cz), { chunkX: cx, chunkZ: cz, lod });
      }
    }
  }

  return needed;
}
