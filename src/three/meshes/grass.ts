import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PhysicsObject } from '../../physics/physics';
import { applyGrassWind } from '../../shaders/grassWind';
import { ChunkGrassCrushMap } from '../../terrain/grassCrushMap';
import {
  CHUNK_SIZE,
  GRASS_TARGET_TUFTS,
  GRASS_TUFT_MAX_CAPACITY,
  chunkWorldCenter,
} from '../../terrain/chunkConfig';
import { hasGrass } from '../../terrain/fieldMask';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;
const BLADE_WIDTH = 0.26;
const BLADE_HEIGHT = 0.4;
const BLADE_HALF_HEIGHT = BLADE_HEIGHT / 2;
const HEIGHT_GRID_RES = 64;
const TUFT_BLADE_COUNT = 5;

let tuftGeometry: THREE.BufferGeometry | null = null;

function createTaperedBladeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, 4);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const normalizedY = (y + BLADE_HALF_HEIGHT) / BLADE_HEIGHT;
    const widthMultiplier = 1 - normalizedY * 0.3;
    positions.setX(i, positions.getX(i) * widthMultiplier);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.translate(0, BLADE_HALF_HEIGHT, 0);
  return geometry;
}

function getTuftGeometry(): THREE.BufferGeometry {
  if (tuftGeometry) return tuftGeometry;

  const blade = createTaperedBladeGeometry();
  const parts: THREE.BufferGeometry[] = [];

  const skirt = blade.clone();
  skirt.scale(2.8, 0.45, 1);
  parts.push(skirt);

  const skirtCross = blade.clone();
  skirtCross.scale(2.8, 0.45, 1);
  skirtCross.rotateY(Math.PI / 2);
  parts.push(skirtCross);

  for (let i = 0; i < TUFT_BLADE_COUNT; i++) {
    const copy = blade.clone();
    copy.rotateY((i / TUFT_BLADE_COUNT) * Math.PI * 2);
    parts.push(copy);
  }

  const merged = mergeGeometries(parts);
  blade.dispose();
  parts.forEach((p) => p.dispose());

  if (!merged) {
    tuftGeometry = createTaperedBladeGeometry();
    return tuftGeometry;
  }

  merged.computeVertexNormals();
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
    color: 0x2d5a28,
    side: THREE.FrontSide,
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

  return {
    mesh,
    grid: createChunkHeightGrid(chunkX, chunkZ),
    centerX,
    centerZ,
  };
}

const _dummy = new THREE.Object3D();

/** Place tufts in grass patches only; returns new placed count. */
export function buildGrassTuftBatch(
  mesh: THREE.InstancedMesh,
  grid: ChunkHeightGrid,
  centerX: number,
  centerZ: number,
  from: number,
  batchGoal: number
): number {
  const target = Math.min(from + batchGoal, GRASS_TARGET_TUFTS);
  let placed = from;
  let tries = 0;
  const maxTries = batchGoal * 18 + 100;

  while (placed < target && tries < maxTries) {
    tries++;
    const x = centerX + (Math.random() - 0.5) * FIELD_SIZE;
    const z = centerZ + (Math.random() - 0.5) * FIELD_SIZE;

    if (!hasGrass(x, z)) continue;

    const y = sampleHeightGrid(grid, x, z);
    const scale = 0.55 + Math.random() * 0.4;
    const spread = scale * 1.4;

    _dummy.position.set(x, y, z);
    _dummy.rotation.y = Math.random() * Math.PI;
    _dummy.rotation.x = (Math.random() - 0.5) * 0.12;
    _dummy.rotation.z = (Math.random() - 0.5) * 0.12;
    _dummy.scale.set(spread, scale, spread);
    _dummy.updateMatrix();
    mesh.setMatrixAt(placed, _dummy.matrix);
    placed++;
  }

  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  return placed;
}

export function isGrassChunkComplete(placed: number): boolean {
  return placed >= GRASS_TARGET_TUFTS;
}

export function disposeGrassMesh(grass: THREE.InstancedMesh): void {
  grass.removeFromParent();
}

export function createGrass(): PhysicsObject {
  const crushMap = new ChunkGrassCrushMap(0, 0);
  const material = createGrassMaterialForChunk(crushMap);
  const { mesh, grid, centerX, centerZ } = beginGrassChunk(0, 0, material);
  buildGrassTuftBatch(mesh, grid, centerX, centerZ, 0, GRASS_TARGET_TUFTS);

  return {
    mesh,
    body: null,
  };
}
