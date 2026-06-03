import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsObject } from '../../physics/physics';
import { getWorld } from '../../physics/world';

export function createSphere(): PhysicsObject {
  const world = getWorld();

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 64, 64),
    new THREE.MeshPhysicalMaterial({
      transmission: 1,
      roughness: 0,
      thickness: 0.5,
      ior: 1.5,
      color: 0x88ccff,
    })
  );

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0)
  );

  world.createCollider(
    RAPIER.ColliderDesc.ball(0.5)
      .setFriction(0.8),
    body
  );

  return { mesh, body };
}
