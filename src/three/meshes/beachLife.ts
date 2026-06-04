import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BEACH_WATER_WORLD_Y,
  BEACH_FULL_X,
  SHORE_LINE_X,
  getLandToBeachMix,
  isInOcean,
} from '../../terrain/beach';
import {
  CHUNK_SIZE,
  chunkWorldCenter,
} from '../../terrain/chunkConfig';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;
const FISH_PER_CHUNK = 14;
const CRABS_PER_CHUNK = 10;

let fishGeometry: THREE.BufferGeometry | null = null;
let crabGeometry: THREE.BufferGeometry | null = null;

function createFishGeometry(): THREE.BufferGeometry {
  if (fishGeometry) return fishGeometry;

  const body = new THREE.BoxGeometry(0.14, 0.05, 0.06);
  const tail = new THREE.ConeGeometry(0.035, 0.09, 4);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.1, 0, 0);

  const merged = mergeGeometries([body, tail]);
  body.dispose();
  tail.dispose();

  fishGeometry = merged ?? body;
  fishGeometry.computeVertexNormals();
  return fishGeometry;
}

function createCrabGeometry(): THREE.BufferGeometry {
  if (crabGeometry) return crabGeometry;

  const parts: THREE.BufferGeometry[] = [];
  const shell = new THREE.SphereGeometry(0.09, 6, 5);
  shell.scale(1.3, 0.4, 1.1);
  parts.push(shell);

  const legOffsets = [
    [0.1, 0.05],
    [0.08, -0.06],
    [-0.1, 0.05],
    [-0.08, -0.06],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.BoxGeometry(0.07, 0.02, 0.02);
    leg.translate(lx, -0.01, lz);
    parts.push(leg);
  }

  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());

  crabGeometry = merged ?? shell;
  crabGeometry.computeVertexNormals();
  return crabGeometry;
}

function hash01(chunkX: number, chunkZ: number, index: number, salt: number): number {
  const s =
    Math.sin(chunkX * 173.3 + chunkZ * 419.2 + index * 0.31 + salt * 71.1) *
    43758.5453;
  return s - Math.floor(s);
}

export function createFishMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc87840,
    emissive: 0x2a1810,
    emissiveIntensity: 0.15,
    roughness: 0.75,
    metalness: 0.05,
  });
}

export function createCrabMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xa84c38,
    roughness: 0.9,
    metalness: 0.02,
  });
}

export type BeachLife = {
  fish: THREE.InstancedMesh;
  crabs: THREE.InstancedMesh;
};

function canPlaceFish(worldX: number, worldY: number, worldZ: number): boolean {
  if (worldX > SHORE_LINE_X + 1.5) return false;
  if (getLandToBeachMix(worldX) < 0.15) return false;
  return isInOcean(worldX, worldY, worldZ);
}

function canPlaceCrab(worldX: number, worldY: number, worldZ: number): boolean {
  if (worldX < SHORE_LINE_X + 0.5 || worldX > BEACH_FULL_X + 1) return false;
  if (getLandToBeachMix(worldX) < 0.35) return false;
  if (isInOcean(worldX, worldY, worldZ)) return false;
  return worldY >= BEACH_WATER_WORLD_Y - 0.15;
}

export function chunkNeedsBeachLife(chunkX: number): boolean {
  const { x: centerX } = chunkWorldCenter(chunkX, 0);
  return centerX - CHUNK_SIZE / 2 < BEACH_FULL_X + 3;
}

export function createBeachLifeForChunk(
  chunkX: number,
  chunkZ: number,
  fishMat: THREE.MeshStandardMaterial,
  crabMat: THREE.MeshStandardMaterial
): BeachLife | null {
  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);

  const fish = new THREE.InstancedMesh(
    createFishGeometry(),
    fishMat,
    FISH_PER_CHUNK
  );
  const crabs = new THREE.InstancedMesh(
    createCrabGeometry(),
    crabMat,
    CRABS_PER_CHUNK
  );

  fish.frustumCulled = false;
  crabs.frustumCulled = false;

  const dummy = new THREE.Object3D();
  let fishCount = 0;
  let crabCount = 0;

  for (let i = 0; i < FISH_PER_CHUNK; i++) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const x =
        centerX +
        (hash01(chunkX, chunkZ, i, 1 + attempt) - 0.5) * FIELD_SIZE * 0.92;
      const z =
        centerZ +
        (hash01(chunkX, chunkZ, i, 2 + attempt) - 0.5) * FIELD_SIZE * 0.92;

      const floorY = getWorldTerrainY(x, z);
      if (!canPlaceFish(x, floorY, z)) continue;

      const y =
        Math.min(floorY + 0.12, BEACH_WATER_WORLD_Y - 0.12) +
        hash01(chunkX, chunkZ, i, 3) * 0.08;

      const scale = 0.7 + hash01(chunkX, chunkZ, i, 4) * 0.55;
      dummy.position.set(x, y, z);
      dummy.rotation.y = hash01(chunkX, chunkZ, i, 5) * Math.PI * 2;
      dummy.rotation.x = (hash01(chunkX, chunkZ, i, 6) - 0.5) * 0.15;
      dummy.rotation.z = (hash01(chunkX, chunkZ, i, 7) - 0.5) * 0.1;
      dummy.scale.set(scale, scale * 0.85, scale);
      dummy.updateMatrix();
      fish.setMatrixAt(fishCount, dummy.matrix);
      fishCount++;
      break;
    }
  }

  for (let i = 0; i < CRABS_PER_CHUNK; i++) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const x =
        centerX +
        (hash01(chunkX, chunkZ, i, 10 + attempt) - 0.5) * FIELD_SIZE * 0.9;
      const z =
        centerZ +
        (hash01(chunkX, chunkZ, i, 20 + attempt) - 0.5) * FIELD_SIZE * 0.9;

      const floorY = getWorldTerrainY(x, z);
      if (!canPlaceCrab(x, floorY, z)) continue;

      const scale = 0.85 + hash01(chunkX, chunkZ, i, 30) * 0.7;
      dummy.position.set(x, floorY + 0.04, z);
      dummy.rotation.y = hash01(chunkX, chunkZ, i, 31) * Math.PI * 2;
      dummy.rotation.x = 0;
      dummy.rotation.z = (hash01(chunkX, chunkZ, i, 32) - 0.5) * 0.08;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      crabs.setMatrixAt(crabCount, dummy.matrix);
      crabCount++;
      break;
    }
  }

  if (fishCount === 0 && crabCount === 0) {
    fish.dispose();
    crabs.dispose();
    return null;
  }

  fish.count = fishCount;
  crabs.count = crabCount;
  fish.instanceMatrix.needsUpdate = true;
  crabs.instanceMatrix.needsUpdate = true;

  return { fish, crabs };
}

export function disposeBeachLife(life: BeachLife): void {
  life.fish.removeFromParent();
  life.crabs.removeFromParent();
}
