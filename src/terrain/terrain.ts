import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsObject } from '../physics/physics';
import { grassTexture } from '../three/textures';
import { getTerrainHeight, TERRAIN_BASE_Y } from './terrainHeight';
import { getWorld } from '../physics/world';

export const TERRAIN_SIZE = 25;
const TERRAIN_SEGMENTS = 100;

export function createTerrain(): PhysicsObject {
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  );

  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);

    positions.setZ(i, getTerrainHeight(x, z));
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
  mesh.position.y = TERRAIN_BASE_Y;
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  const world = getWorld();
  const nrows = TERRAIN_SEGMENTS;
  const ncols = TERRAIN_SEGMENTS;
  const half = TERRAIN_SIZE / 2;
  const heights = new Float32Array((nrows + 1) * (ncols + 1));

  for (let col = 0; col <= ncols; col++) {
    for (let row = 0; row <= nrows; row++) {
      const x = -half + (col / ncols) * TERRAIN_SIZE;
      const z = -half + (row / nrows) * TERRAIN_SIZE;
      const index = row + col * (nrows + 1);
      heights[index] = getTerrainHeight(x, -z);
    }
  }

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, TERRAIN_BASE_Y, 0)
  );

  world.createCollider(
    RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, {
      x: TERRAIN_SIZE,
      y: 1,
      z: TERRAIN_SIZE,
    }).setFriction(1.2),
    body
  );

  return { mesh, body };
}
