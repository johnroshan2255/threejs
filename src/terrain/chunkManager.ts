import * as THREE from 'three';
import {
  createBushesForChunk,
  createBushMaterial,
  disposeBushesMesh,
} from '../three/meshes/bushes';
import {
  beginGrassChunk,
  buildGrassTuftBatch,
  createGrassMaterialForChunk,
  disposeGrassMesh,
  isGrassChunkComplete,
  type ChunkHeightGrid,
} from '../three/meshes/grass';
import { updateGrassShaderUniforms } from '../shaders/grassWind';
import { getNeededTerrainChunks } from './chunkQueries';
import {
  chunkKey,
  GRASS_BUILD_BATCH,
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
  chunkNeedsBeachLife,
  createBeachLifeForChunk,
  createCrabMaterial,
  createFishMaterial,
  disposeBeachLife,
  type BeachLife,
} from '../three/meshes/beachLife';
import {
  createPropsForChunk,
  disposeChunkProps,
  syncPropMeshes,
  type ChunkProps,
} from '../three/meshes/chunkProps';
import { bindTerrainPuddleMap } from '../shaders/terrainSurface';
import { ChunkPuddleMap } from './puddleMap';
import {
  createTerrainChunk,
  disposeTerrainChunk,
  type TerrainChunk,
} from './terrainChunk';

type LoadedChunk = {
  terrain: TerrainChunk;
  grass: THREE.InstancedMesh | null;
  grassMaterial: THREE.MeshLambertMaterial | null;
  bushes: THREE.InstancedMesh | null;
  props: ChunkProps | null;
  beachLife: BeachLife | null;
};

type GrassBuildJob = {
  chunkX: number;
  chunkZ: number;
  mesh: THREE.InstancedMesh;
  material: THREE.MeshLambertMaterial;
  grid: ChunkHeightGrid;
  centerX: number;
  centerZ: number;
  index: number;
};

export class ChunkManager {
  private chunks = new Map<string, LoadedChunk>();
  private crushMaps = new Map<string, ChunkGrassCrushMap>();
  private puddleMaps = new Map<string, ChunkPuddleMap>();
  private grassBuilds = new Map<string, GrassBuildJob>();
  readonly bushMaterial: THREE.MeshStandardMaterial;
  readonly fishMaterial: THREE.MeshStandardMaterial;
  readonly crabMaterial: THREE.MeshStandardMaterial;

  constructor(private scene: THREE.Scene) {
    this.bushMaterial = createBushMaterial();
    this.fishMaterial = createFishMaterial();
    this.crabMaterial = createCrabMaterial();
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

    this.tickGrassBuilds();
    this.syncAllProps();

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

  addPuddleWater(worldX: number, worldZ: number, amount: number): void {
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = chunkX + dx;
        const cz = chunkZ + dz;
        const key = chunkKey(cx, cz);
        if (!this.chunks.has(key)) continue;

        this.getOrCreatePuddleMap(cx, cz).addWater(worldX, worldZ, amount);
        this.puddleMaps.get(key)?.flush();
      }
    }
  }

  updatePuddles(
    dt: number,
    worldX: number,
    worldZ: number,
    rainIntensity: number,
    evaporationRate: number
  ): void {
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);

    for (const [key, chunk] of this.chunks) {
      const [cx, cz] = key.split(',').map(Number);
      const dist = Math.max(
        Math.abs(cx - chunkX),
        Math.abs(cz - chunkZ)
      );
      if (dist > TERRAIN_UNLOAD_RADIUS) continue;

      const map = this.getOrCreatePuddleMap(cx, cz);
      if (rainIntensity > 0.05) {
        map.addDrizzle(rainIntensity, dt);
      }
      map.simulateFlow(dt);
      map.evaporate(evaporationRate, dt);
      map.flush();

      bindTerrainPuddleMap(
        chunk.terrain.mesh.material as THREE.MeshStandardMaterial,
        map
      );
    }
  }

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

  syncAllProps(): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.props) syncPropMeshes(chunk.props);
    }
  }

  updateGrassShaders(
    carCenter: THREE.Vector3,
    timeSec: number,
    grassWindScale = 1
  ): void {
    for (const chunk of this.chunks.values()) {
      if (!chunk.grassMaterial) continue;
      updateGrassShaderUniforms(
        chunk.grassMaterial,
        carCenter,
        timeSec,
        grassWindScale
      );
    }
    for (const job of this.grassBuilds.values()) {
      updateGrassShaderUniforms(job.material, carCenter, timeSec, grassWindScale);
    }
  }

  private tickGrassBuilds(): void {
    for (const [key, job] of this.grassBuilds) {
      const next = buildGrassTuftBatch(
        job.mesh,
        job.grid,
        job.centerX,
        job.centerZ,
        job.index,
        job.index + GRASS_BUILD_BATCH
      );
      job.index = next;

      if (!isGrassChunkComplete(next)) continue;

      const chunk = this.chunks.get(key);
      if (chunk) {
        chunk.grass = job.mesh;
        chunk.grassMaterial = job.material;
        this.ensureBushes(job.chunkX, job.chunkZ);
      }
      this.grassBuilds.delete(key);
    }
  }

  private getOrCreatePuddleMap(chunkX: number, chunkZ: number): ChunkPuddleMap {
    const key = chunkKey(chunkX, chunkZ);
    let map = this.puddleMaps.get(key);
    if (!map) {
      map = new ChunkPuddleMap(chunkX, chunkZ);
      this.puddleMaps.set(key, map);
    }
    return map;
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
    const puddleMap = this.getOrCreatePuddleMap(chunkX, chunkZ);
    bindTerrainPuddleMap(
      terrain.mesh.material as THREE.MeshStandardMaterial,
      puddleMap
    );
    this.scene.add(terrain.mesh);
    this.chunks.set(key, {
      terrain,
      grass: null,
      grassMaterial: null,
      bushes: null,
      props: null,
      beachLife: null,
    });

    this.ensureBeachLife(chunkX, chunkZ);
    this.ensureProps(chunkX, chunkZ);
  }

  private ensureBeachLife(chunkX: number, chunkZ: number): void {
    if (!chunkNeedsBeachLife(chunkX)) return;

    const key = chunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.beachLife) return;

    const life = createBeachLifeForChunk(
      chunkX,
      chunkZ,
      this.fishMaterial,
      this.crabMaterial
    );
    if (!life) return;

    life.fish.renderOrder = 6;
    life.crabs.renderOrder = 5;
    this.scene.add(life.fish);
    this.scene.add(life.crabs);
    chunk.beachLife = life;
  }

  private removeBeachLife(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk?.beachLife) return;
    disposeBeachLife(chunk.beachLife);
    chunk.beachLife = null;
  }

  private ensureProps(chunkX: number, chunkZ: number): void {
    const key = chunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.props) return;

    chunk.props = createPropsForChunk(chunkX, chunkZ, this.scene);
  }

  private removeProps(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk?.props) return;
    disposeChunkProps(chunk.props);
    chunk.props = null;
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
    if (!chunk || chunk.grass || this.grassBuilds.has(key)) return;

    const crushMap = this.getOrCreateCrushMap(chunkX, chunkZ);
    const material = createGrassMaterialForChunk(crushMap);
    const { mesh, grid, centerX, centerZ } = beginGrassChunk(
      chunkX,
      chunkZ,
      material
    );

    mesh.renderOrder = 0;
    this.scene.add(mesh);

    const firstEnd = buildGrassTuftBatch(
      mesh,
      grid,
      centerX,
      centerZ,
      0,
      GRASS_BUILD_BATCH
    );

    if (isGrassChunkComplete(firstEnd)) {
      chunk.grass = mesh;
      chunk.grassMaterial = material;
      this.ensureBushes(chunkX, chunkZ);
      return;
    }

    this.grassBuilds.set(key, {
      chunkX,
      chunkZ,
      mesh,
      material,
      grid,
      centerX,
      centerZ,
      index: firstEnd,
    });
  }

  private cancelGrassBuild(key: string): void {
    const job = this.grassBuilds.get(key);
    if (!job) return;
    disposeGrassMesh(job.mesh);
    job.material.dispose();
    this.grassBuilds.delete(key);
  }

  private removeGrass(key: string): void {
    this.cancelGrassBuild(key);

    const chunk = this.chunks.get(key);
    if (!chunk?.grass) return;
    disposeGrassMesh(chunk.grass);
    chunk.grass = null;
    chunk.grassMaterial?.dispose();
    chunk.grassMaterial = null;
  }

  private unloadChunk(key: string, chunk: LoadedChunk): void {
    this.cancelGrassBuild(key);

    this.scene.remove(chunk.terrain.mesh);
    disposeTerrainChunk(chunk.terrain);

    if (chunk.grass) {
      disposeGrassMesh(chunk.grass);
    }
    chunk.grassMaterial?.dispose();

    if (chunk.bushes) {
      disposeBushesMesh(chunk.bushes);
    }

    this.removeProps(key);
    this.removeBeachLife(key);

    const crush = this.crushMaps.get(key);
    crush?.dispose();
    this.crushMaps.delete(key);

    const puddle = this.puddleMaps.get(key);
    puddle?.dispose();
    this.puddleMaps.delete(key);

    this.chunks.delete(key);
  }

  dispose(): void {
    for (const key of [...this.grassBuilds.keys()]) {
      this.cancelGrassBuild(key);
    }
    for (const [key, chunk] of this.chunks) {
      this.unloadChunk(key, chunk);
    }
    for (const crush of this.crushMaps.values()) {
      crush.dispose();
    }
    this.crushMaps.clear();
    for (const puddle of this.puddleMaps.values()) {
      puddle.dispose();
    }
    this.puddleMaps.clear();
    this.bushMaterial.dispose();
    this.fishMaterial.dispose();
    this.crabMaterial.dispose();
  }
}
