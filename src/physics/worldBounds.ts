import RAPIER from '@dimforge/rapier3d-compat';
import {
  CHUNK_SIZE,
  FINITE_WORLD_MAX_X,
  FINITE_WORLD_MAX_Z,
  FINITE_WORLD_MIN_X,
  FINITE_WORLD_MIN_Z,
} from '../terrain/chunkConfig';
import { getWorld } from './world';

export function createWorldBounds(): RAPIER.RigidBody[] {
  const world = getWorld();
  const halfChunk = CHUNK_SIZE / 2;

  const minX = FINITE_WORLD_MIN_X * CHUNK_SIZE - halfChunk;
  const maxX = FINITE_WORLD_MAX_X * CHUNK_SIZE + halfChunk;
  const minZ = FINITE_WORLD_MIN_Z * CHUNK_SIZE - halfChunk;
  const maxZ = FINITE_WORLD_MAX_Z * CHUNK_SIZE + halfChunk;

  const widthX = maxX - minX;
  const depthZ = maxZ - minZ;
  const wallThickness = 4;
  const wallHeight = 100;

  const wallConfigs = [
    // West wall (-X)
    {
      x: minX - wallThickness / 2,
      y: wallHeight / 2,
      z: (minZ + maxZ) / 2,
      hx: wallThickness / 2,
      hy: wallHeight / 2,
      hz: depthZ / 2 + wallThickness,
    },
    // East wall (+X)
    {
      x: maxX + wallThickness / 2,
      y: wallHeight / 2,
      z: (minZ + maxZ) / 2,
      hx: wallThickness / 2,
      hy: wallHeight / 2,
      hz: depthZ / 2 + wallThickness,
    },
    // North wall (-Z)
    {
      x: (minX + maxX) / 2,
      y: wallHeight / 2,
      z: minZ - wallThickness / 2,
      hx: widthX / 2 + wallThickness,
      hy: wallHeight / 2,
      hz: wallThickness / 2,
    },
    // South wall (+Z)
    {
      x: (minX + maxX) / 2,
      y: wallHeight / 2,
      z: maxZ + wallThickness / 2,
      hx: widthX / 2 + wallThickness,
      hy: wallHeight / 2,
      hz: wallThickness / 2,
    },
  ];

  const bodies: RAPIER.RigidBody[] = [];

  for (const config of wallConfigs) {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(config.x, config.y, config.z)
    );

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(config.hx, config.hy, config.hz).setFriction(
        0.5
      ),
      body
    );

    bodies.push(body);
  }

  return bodies;
}
