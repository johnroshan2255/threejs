import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsObject } from '../../physics/physics';
import { getWorld } from '../../physics/world';
import { groundTexture } from '../textures';

export function createFloor(): PhysicsObject {
  const world = getWorld();

  const mesh = new THREE.Mesh(
    // new THREE.BoxGeometry(10, 0.05, 10),
    new THREE.PlaneGeometry(
      25,
      25
    ),
    new THREE.MeshStandardMaterial({ map: groundTexture })
  );
  
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -1;

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0),
  );

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(5, 0.025, 5).setFriction(1),
    body
  );

  return { mesh, body };
}
