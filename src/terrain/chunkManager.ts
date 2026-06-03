import * as THREE from 'three';
import {
  createGrassForChunk,
  createGrassMaterial,
  disposeGrassMesh,
} from '../three/meshes/grass';
import { getNeededTerrainChunks } from './chunkQueries';
import {
  chunkKey,
  GRASS_VIEW_RADIUS,
  TERRAIN_UNLOAD_RADIUS,
  worldToChunk,
} from './chunkConfig';
import {
  createTerrainChunk,
  disposeTerrainChunk,
  type TerrainChunk,
} from './terrainChunk';

type LoadedChunk = {
  terrain: TerrainChunk;
  grass: THREE.InstancedMesh | null;
};

export class ChunkManager {
  private chunks = new Map<string, LoadedChunk>();
  readonly grassMaterial: THREE.MeshStandardMaterial;

  constructor(private scene: THREE.Scene) {
    this.grassMaterial = createGrassMaterial();
  }

  update(worldX: number, worldZ: number, velX = 0, velZ = 0): void {
    const needed = getNeededTerrainChunks(worldX, worldZ, velX, velZ);
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);

    for (const key of needed) {
      const [cx, cz] = key.split(',').map(Number);
      this.ensureTerrain(cx, cz);

      const dist = Math.max(
        Math.abs(cx - chunkX),
        Math.abs(cz - chunkZ)
      );
      if (dist <= GRASS_VIEW_RADIUS) {
        this.ensureGrass(cx, cz);
      } else {
        this.removeGrass(key);
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (needed.has(key)) continue;

      const [cx, cz] = key.split(',').map(Number);
      const dist = Math.max(
        Math.abs(cx - chunkX),
        Math.abs(cz - chunkZ)
      );
      if (dist > TERRAIN_UNLOAD_RADIUS) {
        this.unloadChunk(key, chunk);
      }
    }
  }

  loadAround(worldX: number, worldZ: number): void {
    this.update(worldX, worldZ, 0, 0);
  }

  private ensureTerrain(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) return;

    const terrain = createTerrainChunk(chunkX, chunkZ);
    this.scene.add(terrain.mesh);
    this.chunks.set(key, { terrain, grass: null });
  }

  private ensureGrass(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.grass) return;

    const grass = createGrassForChunk(chunkX, chunkZ, this.grassMaterial);
    this.scene.add(grass);
    chunk.grass = grass;
  }

  private removeGrass(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk?.grass) return;
    disposeGrassMesh(chunk.grass);
    chunk.grass = null;
  }

  private unloadChunk(key: string, chunk: LoadedChunk): void {
    this.scene.remove(chunk.terrain.mesh);
    disposeTerrainChunk(chunk.terrain);
    if (chunk.grass) {
      disposeGrassMesh(chunk.grass);
    }
    this.chunks.delete(key);
  }

  dispose(): void {
    for (const [key, chunk] of this.chunks) {
      this.unloadChunk(key, chunk);
    }
    this.grassMaterial.dispose();
  }
}
