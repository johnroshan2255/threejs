import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PhysicsObject } from '../../physics/physics';
import { applyGrassWind } from '../../shaders/grassWind';
import { ChunkGrassCrushMap } from '../../terrain/grassCrushMap';
import { createChunkPRNG } from '../../terrain/prng';
import {
  CHUNK_SIZE,
  GRASS_TUFT_MAX_CAPACITY,
  chunkWorldCenter,
} from '../../terrain/chunkConfig';
import { hasGrass } from '../../terrain/fieldMask';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;
const HEIGHT_GRID_RES = 64;

let tuftGeometry: THREE.BufferGeometry | null = null;

function createTaperedBladeGeometry(
  width: number,
  height: number
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, 1, 4);
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const HALF_H = height / 2;

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const normalizedY = (y + HALF_H) / height;
    const widthMultiplier = Math.pow(1 - normalizedY, 0.55);
    positions.setX(i, positions.getX(i) * widthMultiplier);

    const curve = Math.pow(normalizedY, 1.8) * 0.12;
    positions.setZ(i, positions.getZ(i) + curve);

    normals.setXYZ(i, 0, 0.95, 0.1);
  }

  positions.needsUpdate = true;
  normals.needsUpdate = true;
  geometry.translate(0, HALF_H, 0);
  return geometry;
}

function getTuftGeometry(): THREE.BufferGeometry {
  if (tuftGeometry) return tuftGeometry;

  const parts: THREE.BufferGeometry[] = [];
  const BLADE_COUNT = 12;

  for (let i = 0; i < BLADE_COUNT; i++) {
    const w = 0.075 + (i % 3) * 0.02;
    const h = 0.85 + (i % 4) * 0.15;
    const blade = createTaperedBladeGeometry(w, h);

    const angle = (i / BLADE_COUNT) * Math.PI * 2 + i * 0.32;
    const offsetX = Math.sin(angle) * 0.10;
    const offsetZ = Math.cos(angle) * 0.10;
    const tilt = 0.1 + (i % 3) * 0.06;

    blade.rotateX(tilt);
    blade.rotateY(angle);
    blade.translate(offsetX, 0, offsetZ);
    parts.push(blade);
  }

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());

  if (!merged) {
    tuftGeometry = createTaperedBladeGeometry(0.08, 0.95);
    return tuftGeometry;
  }

  const normals = merged.attributes.normal;
  for (let i = 0; i < normals.count; i++) {
    normals.setXYZ(i, 0, 0.95, 0.1);
  }
  normals.needsUpdate = true;

  tuftGeometry = merged;
  return tuftGeometry;
}

export type ChunkHeightGrid = {
  res: number;
  originX: number;
  originZ: number;
  heights: Float32Array;
};

export function createChunkHeightGrid(
  chunkX: number,
  chunkZ: number
): ChunkHeightGrid {
  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const half = CHUNK_SIZE / 2;
  const originX = centerX - half;
  const originZ = centerZ - half;
  const res = HEIGHT_GRID_RES;
  const heights = new Float32Array(res * res);

  for (let iz = 0; iz < res; iz++) {
    for (let ix = 0; ix < res; ix++) {
      const tX = ix / (res - 1);
      const tZ = iz / (res - 1);
      const x = originX + tX * CHUNK_SIZE;
      const z = originZ + tZ * CHUNK_SIZE;
      heights[iz * res + ix] = getWorldTerrainY(x, z);
    }
  }

  return { res, originX, originZ, heights };
}

function sampleHeightGrid(
  grid: ChunkHeightGrid,
  worldX: number,
  worldZ: number
): number {
  const { res, originX, originZ, heights } = grid;
  const u = (worldX - originX) / CHUNK_SIZE;
  const v = (worldZ - originZ) / CHUNK_SIZE;

  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return getWorldTerrainY(worldX, worldZ);
  }

  const fx = u * (res - 1);
  const fz = v * (res - 1);
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(x0 + 1, res - 1);
  const z1 = Math.min(z0 + 1, res - 1);
  const tx = fx - x0;
  const tz = fz - z0;

  const h00 = heights[z0 * res + x0];
  const h10 = heights[z0 * res + x1];
  const h01 = heights[z1 * res + x0];
  const h11 = heights[z1 * res + x1];

  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;
  return h0 * (1 - tz) + h1 * tz;
}

export function createGrassMaterialForChunk(
  crushMap: ChunkGrassCrushMap
): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 8,
  });
  applyGrassWind(material, crushMap);
  return material;
}

export function beginGrassChunk(
  chunkX: number,
  chunkZ: number,
  material: THREE.MeshLambertMaterial
): {
  mesh: THREE.InstancedMesh;
  grid: ChunkHeightGrid;
  centerX: number;
  centerZ: number;
  prng: () => number;
} {
  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const mesh = new THREE.InstancedMesh(
    getTuftGeometry(),
    material,
    GRASS_TUFT_MAX_CAPACITY
  );

  mesh.count = 0;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = true;
  mesh.geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(centerX, 2, centerZ),
    FIELD_SIZE * 0.85
  );

  const prng = createChunkPRNG(chunkX, chunkZ);

  return {
    mesh,
    grid: createChunkHeightGrid(chunkX, chunkZ),
    centerX,
    centerZ,
    prng,
  };
}

const _dummy = new THREE.Object3D();

export function buildGrassTuftBatch(
  mesh: THREE.InstancedMesh,
  grid: ChunkHeightGrid,
  centerX: number,
  centerZ: number,
  from: number,
  batchGoal: number,
  prng: () => number,
  targetTufts: number
): number {
  const target = Math.min(from + batchGoal, targetTufts);
  let placed = from;
  let tries = 0;
  const maxTries = batchGoal * 18 + 100;

  while (placed < target && tries < maxTries) {
    tries++;
    const x = centerX + (prng() - 0.5) * FIELD_SIZE;
    const z = centerZ + (prng() - 0.5) * FIELD_SIZE;

    if (!hasGrass(x, z)) continue;

    const y = sampleHeightGrid(grid, x, z);
    const scale = 1.0 + prng() * 0.45;
    const spread = scale * 1.95;

    _dummy.position.set(x, y, z);
    _dummy.rotation.y = prng() * Math.PI * 2;
    _dummy.rotation.x = (prng() - 0.5) * 0.14;
    _dummy.rotation.z = (prng() - 0.5) * 0.14;
    _dummy.scale.set(spread, scale, spread);
    _dummy.updateMatrix();
    mesh.setMatrixAt(placed, _dummy.matrix);
    placed++;
  }

  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  return placed;
}

export function isGrassChunkComplete(
  placed: number,
  targetTufts: number
): boolean {
  return placed >= targetTufts;
}

export function disposeGrassMesh(grass: THREE.InstancedMesh): void {
  grass.removeFromParent();
}

export function createGrass(): PhysicsObject {
  const crushMap = new ChunkGrassCrushMap(0, 0);
  const material = createGrassMaterialForChunk(crushMap);
  const { mesh, grid, centerX, centerZ, prng } = beginGrassChunk(0, 0, material);
  buildGrassTuftBatch(mesh, grid, centerX, centerZ, 0, 14000, prng, 14000);

  return {
    mesh,
    body: null,
  };
}
