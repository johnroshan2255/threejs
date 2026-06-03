import * as THREE from 'three';
import {
  createBushesForChunk,
  createBushMaterial,
  disposeBushesMesh,
} from '../three/meshes/bushes';
import {
  createGrassForChunk,
  createGrassMaterialForChunk,
  disposeGrassMesh,
} from '../three/meshes/grass';
import { updateGrassShaderUniforms } from '../shaders/grassWind';
import { getNeededTerrainChunks } from './chunkQueries';
import {
  chunkKey,
  BUSH_VIEW_RADIUS,
  GRASS_VIEW_RADIUS,
  TERRAIN_UNLOAD_RADIUS,
  worldToChunk,
} from './chunkConfig';
import {
  ChunkGrassCrushMap,
  GRASS_CRUSH_STAMP_RADIUS,
} from './grassCrushMap';
import {
  createTerrainChunk,
  disposeTerrainChunk,
  type TerrainChunk,
} from './terrainChunk';

type LoadedChunk = {
  terrain: TerrainChunk;
  grass: THREE.InstancedMesh | null;
  grassMaterial: THREE.MeshStandardMaterial | null;
  bushes: THREE.InstancedMesh | null;
};

export class ChunkManager {
  private chunks = new Map<string, LoadedChunk>();
  private crushMaps = new Map<string, ChunkGrassCrushMap>();
  readonly bushMaterial: THREE.MeshStandardMaterial;

  constructor(private scene: THREE.Scene) {
    this.bushMaterial = createBushMaterial();
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

      if (dist > BUSH_VIEW_RADIUS) {
        this.removeBushes(key);
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

  /** Record tire paths; grass stays hidden until recover timer in shader. */
  stampGrassCrush(wheelPositions: THREE.Vector3[], timeSec: number): void {
    const dirty = new Set<string>();

    for (const wheel of wheelPositions) {
      const { chunkX, chunkZ } = worldToChunk(wheel.x, wheel.z);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = chunkX + dx;
          const cz = chunkZ + dz;
          const key = chunkKey(cx, cz);
          if (!this.chunks.has(key)) continue;

          this.getOrCreateCrushMap(cx, cz).stamp(
            wheel.x,
            wheel.z,
            GRASS_CRUSH_STAMP_RADIUS,
            timeSec
          );
          dirty.add(key);
        }
      }
    }

    for (const key of dirty) {
      this.crushMaps.get(key)?.flush();
    }
  }

  updateGrassShaders(carCenter: THREE.Vector3, timeSec: number): void {
    for (const chunk of this.chunks.values()) {
      if (!chunk.grassMaterial) continue;
      updateGrassShaderUniforms(chunk.grassMaterial, carCenter, timeSec);
    }
  }

  private getOrCreateCrushMap(chunkX: number, chunkZ: number): ChunkGrassCrushMap {
    const key = chunkKey(chunkX, chunkZ);
    let map = this.crushMaps.get(key);
    if (!map) {
      map = new ChunkGrassCrushMap(chunkX, chunkZ);
      this.crushMaps.set(key, map);
    }
    return map;
  }

  private ensureTerrain(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) return;

    const terrain = createTerrainChunk(chunkX, chunkZ);
    this.scene.add(terrain.mesh);
    this.chunks.set(key, {
      terrain,
      grass: null,
      grassMaterial: null,
      bushes: null,
    });
  }

  private ensureBushes(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.bushes) return;

    const bushes = createBushesForChunk(
      chunkX,
      chunkZ,
      this.bushMaterial
    );
    bushes.renderOrder = 10;
    this.scene.add(bushes);
    chunk.bushes = bushes;
  }

  private removeBushes(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk?.bushes) return;
    disposeBushesMesh(chunk.bushes);
    chunk.bushes = null;
  }

  private ensureGrass(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.grass) return;

    const crushMap = this.getOrCreateCrushMap(chunkX, chunkZ);
    const material = createGrassMaterialForChunk(crushMap);
    const grass = createGrassForChunk(chunkX, chunkZ, material);
    grass.renderOrder = 0;
    this.scene.add(grass);
    chunk.grass = grass;
    chunk.grassMaterial = material;

    this.ensureBushes(chunkX, chunkZ);
  }

  private removeGrass(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk?.grass) return;
    disposeGrassMesh(chunk.grass);
    chunk.grass = null;
    chunk.grassMaterial?.dispose();
    chunk.grassMaterial = null;
  }

  private unloadChunk(key: string, chunk: LoadedChunk): void {
    this.scene.remove(chunk.terrain.mesh);
    disposeTerrainChunk(chunk.terrain);

    if (chunk.grass) {
      disposeGrassMesh(chunk.grass);
    }
    chunk.grassMaterial?.dispose();

    if (chunk.bushes) {
      disposeBushesMesh(chunk.bushes);
    }

    const crush = this.crushMaps.get(key);
    crush?.dispose();
    this.crushMaps.delete(key);
    this.chunks.delete(key);
  }

  dispose(): void {
    for (const [key, chunk] of this.chunks) {
      this.unloadChunk(key, chunk);
    }
    for (const crush of this.crushMaps.values()) {
      crush.dispose();
    }
    this.crushMaps.clear();
    this.bushMaterial.dispose();
  }
}
