import * as THREE from 'three';
import { getLandToBeachMix } from './beach';
import { CHUNK_SIZE, chunkWorldCenter } from './chunkConfig';
import { getWorldTerrainY } from './terrainHeight';

const MAP_RES = 56;
const MAX_DEPTH = 0.42;

export class ChunkPuddleMap {
  readonly originX: number;
  readonly originZ: number;
  readonly texture: THREE.DataTexture;
  private readonly heights: Float32Array;
  private readonly depths: Float32Array;
  private readonly scratch: Float32Array;
  private dirty = false;

  constructor(
    readonly chunkX: number,
    readonly chunkZ: number
  ) {
    const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
    this.originX = centerX - CHUNK_SIZE / 2;
    this.originZ = centerZ - CHUNK_SIZE / 2;

    const n = MAP_RES * MAP_RES;
    this.heights = new Float32Array(n);
    this.depths = new Float32Array(n);
    this.scratch = new Float32Array(n);

    for (let iz = 0; iz < MAP_RES; iz++) {
      for (let ix = 0; ix < MAP_RES; ix++) {
        const tX = ix / (MAP_RES - 1);
        const tZ = iz / (MAP_RES - 1);
        const worldX = this.originX + tX * CHUNK_SIZE;
        const worldZ = this.originZ + tZ * CHUNK_SIZE;
        this.heights[iz * MAP_RES + ix] = getWorldTerrainY(worldX, worldZ);
      }
    }

    this.texture = new THREE.DataTexture(
      this.depths,
      MAP_RES,
      MAP_RES,
      THREE.RedFormat,
      THREE.FloatType
    );
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
  }

  contains(worldX: number, worldZ: number, padding = 0): boolean {
    return (
      worldX >= this.originX - padding &&
      worldX <= this.originX + CHUNK_SIZE + padding &&
      worldZ >= this.originZ - padding &&
      worldZ <= this.originZ + CHUNK_SIZE + padding
    );
  }

  addWater(worldX: number, worldZ: number, amount: number): void {
    if (getLandToBeachMix(worldX) > 0.12) return;
    if (!this.contains(worldX, worldZ)) return;

    const cx = ((worldX - this.originX) / CHUNK_SIZE) * (MAP_RES - 1);
    const cz = ((worldZ - this.originZ) / CHUNK_SIZE) * (MAP_RES - 1);
    const ix = Math.floor(cx);
    const iz = Math.floor(cz);
    const r = Math.max(1, Math.floor((amount * 18) / CHUNK_SIZE * MAP_RES));

    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = ix + dx;
        const z = iz + dz;
        if (x < 0 || x >= MAP_RES || z < 0 || z >= MAP_RES) continue;
        const dist = Math.hypot(dx, dz);
        if (dist > r) continue;
        const falloff = 1 - dist / (r + 0.001);
        const i = z * MAP_RES + x;
        this.depths[i] = Math.min(
          MAX_DEPTH,
          this.depths[i]! + amount * falloff
        );
        this.dirty = true;
      }
    }
  }

  /** Light rain across whole chunk. */
  addDrizzle(intensity: number, dt: number): void {
    if (intensity <= 0.02) return;
    const add = intensity * 0.004 * dt;
    for (let i = 0; i < this.depths.length; i++) {
      if (this.heights[i]! > 2.5) continue;
      this.depths[i] = Math.min(MAX_DEPTH, this.depths[i]! + add * (0.3 + Math.random() * 0.7));
    }
    this.dirty = true;
  }

  simulateFlow(dt: number): void {
    const rate = Math.min(1, dt * 6);
    this.scratch.fill(0);

    for (let z = 1; z < MAP_RES - 1; z++) {
      for (let x = 1; x < MAP_RES - 1; x++) {
        const i = z * MAP_RES + x;
        const depth = this.depths[i]!;
        if (depth < 0.002) continue;

        const surface = this.heights[i]! + depth;
        const neighbors = [
          [x - 1, z],
          [x + 1, z],
          [x, z - 1],
          [x, z + 1],
        ] as const;

        for (const [nx, nz] of neighbors) {
          const ni = nz * MAP_RES + nx;
          const nSurf = this.heights[ni]! + this.depths[ni]!;
          const diff = surface - nSurf;
          if (diff <= 0.003) continue;

          const transfer = Math.min(
            diff * 0.42 * rate,
            depth * 0.35,
            0.12 * rate
          );
          this.scratch[i]! -= transfer;
          this.scratch[ni]! += transfer;
        }
      }
    }

    for (let i = 0; i < this.depths.length; i++) {
      this.depths[i] = Math.max(0, this.depths[i]! + this.scratch[i]!);
    }
    this.dirty = true;
  }

  evaporate(rate: number, dt: number): void {
    if (rate <= 0) return;
    let changed = false;
    for (let i = 0; i < this.depths.length; i++) {
      const next = Math.max(0, this.depths[i]! - rate * dt);
      if (next !== this.depths[i]) {
        this.depths[i] = next;
        changed = true;
      }
    }
    if (changed) this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
