import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { grassTexture } from '../three/textures';
import {
  CHUNK_SEGMENTS,
  CHUNK_SIZE,
  chunkWorldCenter,
} from './chunkConfig';
import { getTerrainHeight, TERRAIN_BASE_Y } from './terrainHeight';
import { getWorld } from '../physics/world';

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

  for (let i = 0; i < positions.count; i++) {
    const localX = positions.getX(i);
    const localY = positions.getY(i);
    const worldX = centerX + localX;
    const worldZ = centerZ - localY;

    positions.setZ(i, getTerrainHeight(worldX, -worldZ));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: grassTexture,
    })
  );

  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(centerX, TERRAIN_BASE_Y, centerZ);
  mesh.receiveShadow = true;

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
    }).setFriction(1.2),
    body
  );

  return { chunkX, chunkZ, mesh, body };
}

export function disposeTerrainChunk(chunk: TerrainChunk): void {
  const world = getWorld();
  world.removeRigidBody(chunk.body);
  chunk.mesh.geometry.dispose();
  (chunk.mesh.material as THREE.Material).dispose();
}
