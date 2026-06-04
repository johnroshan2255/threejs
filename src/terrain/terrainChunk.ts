import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  BEACH_WATER_WORLD_Y,
  getLandToBeachMix,
  getShoreWetMix,
  isInOcean,
} from './beach';
import { getTerrainHeight, TERRAIN_BASE_Y } from './terrainHeight';
import { createTerrainBlendMaterial } from '../shaders/terrainSurface';
import {
  CHUNK_SEGMENTS,
  CHUNK_SIZE,
  chunkWorldCenter,
} from './chunkConfig';
import { getWorld } from '../physics/world';

const _mudColor = new THREE.Color(0xffffff);
const _sandColor = new THREE.Color(0xf2e0b8);
const _wetColor = new THREE.Color(0xc8b888);
const _shallowSeaColor = new THREE.Color(0x6a9a8e);
const _underColor = new THREE.Color(0x3d6a62);

export type TerrainChunk = {
  chunkX: number;
  chunkZ: number;
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
};

export function createTerrainChunk(
  chunkX: number,
  chunkZ: number
): TerrainChunk {
  const geometry = new THREE.PlaneGeometry(
    CHUNK_SIZE,
    CHUNK_SIZE,
    CHUNK_SEGMENTS,
    CHUNK_SEGMENTS
  );

  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const half = CHUNK_SIZE / 2;
  const originX = centerX - half;
  const originZ = centerZ - half;

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const sandMix = new Float32Array(positions.count);
  const wetMix = new Float32Array(positions.count);
  let maxSand = 0;

  for (let i = 0; i < positions.count; i++) {
    const localX = positions.getX(i);
    const localY = positions.getY(i);
    const worldX = centerX + localX;
    const worldZ = centerZ - localY;

    const height = getTerrainHeight(worldX, -worldZ);
    positions.setZ(i, height);

    const worldY = TERRAIN_BASE_Y + height;
    const landMix = getLandToBeachMix(worldX);
    const shoreMix = getShoreWetMix(worldX, worldY, worldZ);
    maxSand = Math.max(maxSand, landMix);

    sandMix[i] = landMix;
    wetMix[i] = shoreMix;

    if (isInOcean(worldX, worldY, worldZ)) {
      const depth = BEACH_WATER_WORLD_Y - worldY;
      if (depth < 0.65) {
        _mudColor.copy(_sandColor);
        _mudColor.lerp(_shallowSeaColor, depth / 0.65);
        _mudColor.lerp(_wetColor, shoreMix * 0.6);
      } else {
        _mudColor.copy(_underColor);
      }
    } else {
      _mudColor.copy(_sandColor);
      _mudColor.lerp(_wetColor, shoreMix);
      _mudColor.lerp(_sandColor, 1 - landMix * 0.15);
    }

    colors[i * 3] = _mudColor.r;
    colors[i * 3 + 1] = _mudColor.g;
    colors[i * 3 + 2] = _mudColor.b;
  }

  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSandMix', new THREE.BufferAttribute(sandMix, 1));
  geometry.setAttribute('aWetMix', new THREE.BufferAttribute(wetMix, 1));
  geometry.computeVertexNormals();

  const material = createTerrainBlendMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(centerX, TERRAIN_BASE_Y, centerZ);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const world = getWorld();
  const nrows = CHUNK_SEGMENTS;
  const ncols = CHUNK_SEGMENTS;
  const heights = new Float32Array((nrows + 1) * (ncols + 1));

  for (let col = 0; col <= ncols; col++) {
    for (let row = 0; row <= nrows; row++) {
      const worldX = originX + (col / ncols) * CHUNK_SIZE;
      const worldZ = originZ + (row / nrows) * CHUNK_SIZE;
      const index = row + col * (nrows + 1);
      heights[index] = getTerrainHeight(worldX, -worldZ);
    }
  }

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(centerX, TERRAIN_BASE_Y, centerZ)
  );

  world.createCollider(
    RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, {
      x: CHUNK_SIZE,
      y: 1,
      z: CHUNK_SIZE,
    }).setFriction(maxSand > 0.35 ? 0.92 : 1.15),
    body
  );

  return { chunkX, chunkZ, mesh, body };
}

export function disposeTerrainChunk(chunk: TerrainChunk): void {
  const world = getWorld();
  world.removeRigidBody(chunk.body);
  chunk.mesh.geometry.dispose();
  const mat = chunk.mesh.material as THREE.MeshStandardMaterial;
  mat.map = null;
  mat.dispose();
}
