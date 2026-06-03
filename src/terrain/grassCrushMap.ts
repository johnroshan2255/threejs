import * as THREE from 'three';
import { CAR_CONFIG } from '../entities/car/carConfig';
import { CHUNK_SIZE, chunkWorldCenter } from './chunkConfig';

/** Match tire width — contact patch only, not full wheel radius. */
export const GRASS_CRUSH_STAMP_RADIUS = CAR_CONFIG.wheelWidth;
export const GRASS_CRUSH_RECOVER_SEC = 10;
export const GRASS_CRUSH_GROW_SEC = 1.2;

const MAP_RES = 128;

export class ChunkGrassCrushMap {
  readonly originX: number;
  readonly originZ: number;
  readonly texture: THREE.DataTexture;
  private readonly data: Float32Array;
  private dirty = false;

  constructor(
    readonly chunkX: number,
    readonly chunkZ: number
  ) {
    const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
    this.originX = centerX - CHUNK_SIZE / 2;
    this.originZ = centerZ - CHUNK_SIZE / 2;

    this.data = new Float32Array(MAP_RES * MAP_RES);
    this.texture = new THREE.DataTexture(
      this.data,
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

  /** Stamp crush time (seconds). Re-stamping refreshes the 10s recover timer. */
  stamp(worldX: number, worldZ: number, radius: number, timeSec: number): void {
    if (!this.contains(worldX, worldZ, radius)) return;

    const rPx = (radius / CHUNK_SIZE) * MAP_RES;
    const cx = ((worldX - this.originX) / CHUNK_SIZE) * MAP_RES;
    const cz = ((worldZ - this.originZ) / CHUNK_SIZE) * MAP_RES;

    const minX = Math.max(0, Math.floor(cx - rPx));
    const maxX = Math.min(MAP_RES - 1, Math.ceil(cx + rPx));
    const minZ = Math.max(0, Math.floor(cz - rPx));
    const maxZ = Math.min(MAP_RES - 1, Math.ceil(cz + rPx));
    const rSq = rPx * rPx;

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dz = z - cz;
        if (dx * dx + dz * dz > rSq) continue;

        const i = z * MAP_RES + x;
        this.data[i] = timeSec;
        this.dirty = true;
      }
    }
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
