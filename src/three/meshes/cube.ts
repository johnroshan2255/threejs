import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsObject } from '../../physics/physics';
import { getWorld } from '../../physics/world';

export function createCube(): PhysicsObject {
  const world = getWorld();

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8a5a3a })
  );

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
  );

  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body);

  return { mesh, body };
}
